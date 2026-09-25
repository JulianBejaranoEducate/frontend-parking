import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { BRAND } from '../../core/config/branding.config';
import {
  VEHICLE_REQUIREMENTS,
  type Vehicle,
  type VehicleType,
  vehicleDetails,
  vehicleLabel,
  vehicleTitle,
} from '../../core/models/vehicle';
import {
  DOCUMENT_LABELS,
  DOCUMENT_REQUIREMENTS,
  type DeclaredOwner,
  type DocumentKind,
  type DocumentRequirement,
  type NameMatch,
  type RegistrationDocument,
  type VehicleRegistration,
  compareNames,
  latestReview,
} from '../../core/models/vehicle-registration';
import { DOCUMENT_TYPES, type DocumentType } from '../../core/models/visitor-pass';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { RegistrationError, VehicleRegistrationService } from '../../core/services/vehicle-registration.service';

type Step = 'type' | 'details' | 'documents' | 'review' | 'done';

const STEPS: readonly { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'type', label: 'Vehículo' },
  { id: 'details', label: 'Datos' },
  { id: 'documents', label: 'Documentos' },
  { id: 'review', label: 'Confirmar' },
];

const TYPE_OPTIONS: readonly { value: VehicleType; description: string }[] = [
  { value: 'moto', description: 'Datos del vehículo y foto de la tarjeta de propiedad.' },
  { value: 'bicicleta', description: 'Tu documento, marca, color y, si lo tiene, el serial del marco.' },
  { value: 'scooter', description: 'Tu documento, el color y, si la tienes, la factura de compra.' },
];

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'documentType'
  | 'documentNumber'
  | 'plate'
  | 'brand'
  | 'line'
  | 'modelYear'
  | 'color'
  | 'frameSerial';

/**
 * Qué campos pide cada vehículo. Los demás se deshabilitan y no cuentan.
 *
 * Todos piden documento: portería busca bicicletas y scooters por documento
 * (ADR-007). Qué es opcional lo decide `VEHICLE_REQUIREMENTS`.
 */
const FIELDS_BY_TYPE: Record<VehicleType, readonly FieldName[]> = {
  moto: ['firstName', 'lastName', 'documentType', 'documentNumber', 'plate', 'brand', 'line', 'modelYear', 'color'],
  bicicleta: ['firstName', 'lastName', 'documentType', 'documentNumber', 'brand', 'color', 'frameSerial'],
  scooter: ['firstName', 'lastName', 'documentType', 'documentNumber', 'brand', 'color'],
};

const ALL_FIELDS: readonly FieldName[] = [
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'plate',
  'brand',
  'line',
  'modelYear',
  'color',
  'frameSerial',
];

/** Placa de moto colombiana. La letra final es opcional en motos antiguas. */
const PLATE_PATTERN = /^[A-Z]{3}\d{2}[A-Z]?$/;
const DOCUMENT_NUMBER_PATTERN = /^\d{6,11}$/;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const SERIAL_PATTERN = /^[A-Z0-9-]{4,30}$/;
const CURRENT_YEAR = new Date().getFullYear();

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  firstName: 'Escribe tus nombres.',
  lastName: 'Escribe tus apellidos.',
  documentType: 'Selecciona el tipo de documento.',
  documentNumber: 'Escribe tu número de documento.',
  plate: 'Escribe la placa.',
  brand: 'Escribe la marca.',
  line: 'Escribe la línea, como aparece en la tarjeta.',
  modelYear: 'Escribe el año del modelo.',
  color: 'Escribe el color.',
  frameSerial: '',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  firstName: 'Usa solo letras y espacios.',
  lastName: 'Usa solo letras y espacios.',
  documentNumber: 'Debe tener entre 6 y 11 dígitos, sin puntos ni espacios.',
  plate: 'Usa el formato de placa de moto: ABC12D.',
  frameSerial: 'Usa solo letras, números y guiones (4 a 30 caracteres).',
};

@Component({
  imports: [NgTemplateOutlet, ReactiveFormsModule, RouterLink],
  selector: 'app-register-vehicle',
  styleUrl: './register-vehicle.css',
  templateUrl: './register-vehicle.html',
})
export class RegisterVehicle {
  /** Llega de ?actualizar=<id>: el usuario vuelve a enviar lo que se le pidió. */
  readonly actualizar = input<string>();

  private readonly auth = inject(AuthService);
  private readonly registrations = inject(VehicleRegistrationService);
  private readonly uploads = inject(UploadService);
  private readonly injector = inject(Injector);
  private readonly fb = inject(FormBuilder);

  protected readonly brand = BRAND;
  protected readonly steps = STEPS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly vehicleLabel = vehicleLabel;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;
  protected readonly documentLabels = DOCUMENT_LABELS;
  protected readonly maxYear = CURRENT_YEAR + 1;
  protected readonly maxVehicles = this.registrations.maxPerUser;
  protected readonly canRegisterMore = this.registrations.canRegisterMore;
  protected readonly accountName = computed(() => this.auth.user()?.displayName ?? '');

  // ---- Modo actualización ------------------------------------------------------------

  protected readonly isUpdateMode = computed(() => Boolean(this.actualizar()));

  /** La solicitud a actualizar, solo si es propia y de verdad espera documentos. */
  protected readonly updateTarget = computed<VehicleRegistration | null>(() => {
    const registration = this.registrations.find(this.actualizar());

    return registration &&
      registration.applicant.uid === this.auth.user()?.uid &&
      registration.status === 'needs-update'
      ? registration
      : null;
  });

  protected readonly requestedReview = computed(() => {
    const target = this.updateTarget();
    return target ? latestReview(target) : null;
  });

  // ---- Pasos ---------------------------------------------------------------------------

  protected readonly step = linkedSignal<Step>(() => (this.actualizar() ? 'documents' : 'type'));
  protected readonly stepIndex = computed(() => STEPS.findIndex((item) => item.id === this.step()));

  protected readonly vehicleType = linkedSignal<VehicleType | null>(
    () => this.updateTarget()?.vehicle.type ?? null,
  );

  protected readonly showTypeError = signal(false);

  // ---- Datos -----------------------------------------------------------------------------

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(NAME_PATTERN)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(NAME_PATTERN)]],
    documentType: ['CC' as DocumentType, Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(DOCUMENT_NUMBER_PATTERN)]],
    plate: [
      '',
      [Validators.required, Validators.pattern(PLATE_PATTERN), (control: AbstractControl) => this.plateTaken(control)],
    ],
    brand: ['', [Validators.required, Validators.maxLength(30)]],
    line: ['', [Validators.required, Validators.maxLength(40)]],
    modelYear: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1970),
      Validators.max(CURRENT_YEAR + 1),
    ]),
    color: ['', [Validators.required, Validators.maxLength(30)]],
    frameSerial: ['', [Validators.pattern(SERIAL_PATTERN)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly detailsAttempted = signal(false);

  /** Primera validación: lo escrito frente a la cuenta institucional. */
  protected readonly nameCheck = computed<NameMatch | null>(() => {
    const { firstName, lastName } = this.formValue();
    const account = this.accountName();

    if (!account || firstName.trim().length < 2 || lastName.trim().length < 2) {
      return null;
    }

    return compareNames(`${firstName} ${lastName}`, account);
  });

  // ---- Documentos --------------------------------------------------------------------------

  protected readonly documents = signal<Partial<Record<DocumentKind, RegistrationDocument>>>({});
  protected readonly uploading = signal<DocumentKind | null>(null);
  protected readonly uploadErrors = signal<Partial<Record<DocumentKind, string>>>({});
  protected readonly documentsAttempted = signal(false);

  protected readonly requirements = computed<readonly DocumentRequirement[]>(() => {
    const type = this.vehicleType();

    if (!type) {
      return [];
    }

    const requested = this.requestedReview()?.documentKind;

    // Al actualizar solo se pide el documento que señaló la administración, y
    // pasa a ser obligatorio aunque en el registro normal fuera opcional.
    return requested
      ? DOCUMENT_REQUIREMENTS[type]
          .filter((requirement) => requirement.kind === requested)
          .map((requirement) => ({ ...requirement, required: true }))
      : DOCUMENT_REQUIREMENTS[type];
  });

  protected readonly missingDocuments = computed(() =>
    this.requirements().filter((requirement) => requirement.required && !this.documents()[requirement.kind]),
  );

  // ---- Envío -----------------------------------------------------------------------------------

  protected readonly declarationAccepted = signal(false);
  protected readonly declarationAttempted = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitted = signal<VehicleRegistration | null>(null);

  /** Lo declarado, tal como lo verá la administración. */
  protected readonly summaryOwner = computed(() => {
    this.formValue();
    return this.buildOwner();
  });

  protected readonly summaryVehicle = computed(() => {
    this.formValue();
    return this.vehicleType() ? this.buildVehicle() : null;
  });

  constructor() {
    this.syncEnabledFields(null);
  }

  // ---- Navegación ----------------------------------------------------------------------------------

  protected chooseType(type: VehicleType): void {
    if (this.vehicleType() !== type) {
      this.vehicleType.set(type);
      this.documents.set({});
      this.uploadErrors.set({});
      this.syncEnabledFields(type);
    }

    this.showTypeError.set(false);
  }

  protected continueFromType(): void {
    const type = this.vehicleType();

    if (!type) {
      this.showTypeError.set(true);
      return;
    }

    this.syncEnabledFields(type);
    this.goTo('details');
  }

  protected continueFromDetails(): void {
    this.detailsAttempted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    this.goTo('documents');
  }

  protected continueFromDocuments(): void {
    this.documentsAttempted.set(true);

    if (this.missingDocuments().length || this.uploading()) {
      return;
    }

    if (this.isUpdateMode()) {
      this.resubmit();
      return;
    }

    this.goTo('review');
  }

  protected back(): void {
    const previous: Partial<Record<Step, Step>> = { details: 'type', documents: 'details', review: 'documents' };
    const target = previous[this.step()];

    if (target) {
      this.goTo(target);
    }
  }

  protected toggleDeclaration(event: Event): void {
    this.declarationAccepted.set((event.target as HTMLInputElement).checked);
  }

  protected submit(): void {
    this.declarationAttempted.set(true);
    this.submitError.set(null);

    if (!this.declarationAccepted()) {
      return;
    }

    try {
      const registration = this.registrations.submit({
        owner: this.buildOwner(),
        vehicle: this.buildVehicle(),
        documents: Object.values(this.documents()),
      });

      this.submitted.set(registration);
      this.goTo('done');
    } catch (error) {
      this.submitError.set(
        error instanceof RegistrationError ? error.message : 'No pudimos enviar la solicitud. Inténtalo de nuevo.',
      );
    }
  }

  /** Empieza de cero para registrar otro vehículo. */
  protected startOver(): void {
    this.form.reset();
    this.vehicleType.set(null);
    this.documents.set({});
    this.uploadErrors.set({});
    this.declarationAccepted.set(false);
    this.declarationAttempted.set(false);
    this.detailsAttempted.set(false);
    this.documentsAttempted.set(false);
    this.submitted.set(null);
    this.syncEnabledFields(null);
    this.goTo('type');
  }

  // ---- Archivos ------------------------------------------------------------------------------------

  protected async onFileSelected(event: Event, kind: DocumentKind): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Permite volver a elegir el mismo archivo después de quitarlo.
    input.value = '';

    if (!file) {
      return;
    }

    this.uploading.set(kind);
    this.uploadErrors.update((errors) => ({ ...errors, [kind]: undefined }));

    try {
      const document = await this.uploads.prepare(file, kind);
      this.documents.update((documents) => ({ ...documents, [kind]: document }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo adjuntar el archivo.';
      this.uploadErrors.update((errors) => ({ ...errors, [kind]: message }));
    } finally {
      this.uploading.set(null);
    }
  }

  protected removeDocument(kind: DocumentKind): void {
    this.documents.update((documents) => {
      const next = { ...documents };
      delete next[kind];
      return next;
    });
  }

  protected isImage(document: RegistrationDocument): boolean {
    return document.mimeType.startsWith('image/');
  }

  /** Las plantillas reciben el requisito sin tipo: estos accesos lo recuperan. */
  protected documentFor(requirement: DocumentRequirement): RegistrationDocument | undefined {
    return this.documents()[requirement.kind];
  }

  protected uploadErrorFor(requirement: DocumentRequirement): string | undefined {
    return this.uploadErrors()[requirement.kind];
  }

  // ---- Normalización mientras se escribe --------------------------------------------------------

  protected normalizePlate(): void {
    this.rewrite('plate', (value) => value.toUpperCase().replace(/[\s-]/g, ''));
  }

  protected normalizeDocumentNumber(): void {
    this.rewrite('documentNumber', (value) => value.replace(/\D/g, ''));
  }

  protected normalizeSerial(): void {
    this.rewrite('frameSerial', (value) => value.toUpperCase().replace(/\s/g, ''));
  }

  // ---- Presentación -------------------------------------------------------------------------------

  protected shows(field: FieldName): boolean {
    const type = this.vehicleType();
    return type ? FIELDS_BY_TYPE[type].includes(field) : false;
  }

  /** true si el campo se puede dejar vacío para el tipo elegido (p. ej. la marca del scooter). */
  protected isOptional(field: 'brand' | 'color' | 'frameSerial'): boolean {
    const type = this.vehicleType();
    return type ? VEHICLE_REQUIREMENTS[type][field] === 'optional' : false;
  }

  protected isInvalid(field: FieldName): boolean {
    const control = this.form.controls[field];
    return control.enabled && control.invalid && (control.touched || this.detailsAttempted());
  }

  protected errorFor(field: FieldName): string | null {
    const control = this.form.controls[field];

    if (!this.isInvalid(field) || !control.errors) {
      return null;
    }

    const errors = control.errors;

    if (errors['required']) {
      return REQUIRED_MESSAGES[field];
    }

    if (errors['plateTaken']) {
      return 'Esta placa ya tiene un registro vigente.';
    }

    if (errors['pattern']) {
      return PATTERN_MESSAGES[field] ?? 'Revisa el formato.';
    }

    if (errors['min'] || errors['max']) {
      return `Escribe un año entre 1970 y ${CURRENT_YEAR + 1}.`;
    }

    if (errors['minlength']) {
      return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
    }

    if (errors['maxlength']) {
      return `No puede superar los ${errors['maxlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este dato.';
  }

  protected documentTypeLabel(value: DocumentType | undefined): string {
    return DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? '';
  }

  // ---- Internos ------------------------------------------------------------------------------------

  private resubmit(): void {
    const target = this.updateTarget();

    if (!target) {
      return;
    }

    try {
      this.registrations.resubmit(target.id, Object.values(this.documents()));
      this.submitted.set(this.registrations.find(target.id) ?? target);
      this.goTo('done');
    } catch (error) {
      this.submitError.set(
        error instanceof RegistrationError ? error.message : 'No pudimos enviar el documento. Inténtalo de nuevo.',
      );
    }
  }

  private buildOwner(): DeclaredOwner {
    const value = this.form.getRawValue();
    const owner: DeclaredOwner = { firstName: value.firstName.trim(), lastName: value.lastName.trim() };

    if (this.shows('documentNumber')) {
      owner.documentType = value.documentType;
      owner.documentNumber = value.documentNumber;
    }

    return owner;
  }

  private buildVehicle(): Vehicle {
    const value = this.form.getRawValue();
    const vehicle: Vehicle = { type: this.vehicleType() ?? 'moto' };

    if (this.shows('plate')) {
      vehicle.plate = value.plate;
    }

    if (this.shows('brand') && value.brand.trim()) {
      vehicle.brand = value.brand.trim();
    }

    if (this.shows('line')) {
      vehicle.line = value.line.trim();
    }

    if (this.shows('modelYear') && value.modelYear !== null) {
      vehicle.modelYear = Number(value.modelYear);
    }

    if (this.shows('color')) {
      vehicle.color = value.color.trim();
    }

    if (this.shows('frameSerial') && value.frameSerial) {
      vehicle.frameSerial = value.frameSerial;
    }

    return vehicle;
  }

  /**
   * Habilita solo los campos del tipo elegido y ajusta los que cambian de nivel
   * según el tipo: la marca es obligatoria salvo en el scooter.
   */
  private syncEnabledFields(type: VehicleType | null): void {
    const enabled = new Set(type ? FIELDS_BY_TYPE[type] : []);

    for (const field of ALL_FIELDS) {
      const control = this.form.controls[field];

      if (enabled.has(field)) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }

    const brand = this.form.controls.brand;
    brand.setValidators(
      type && VEHICLE_REQUIREMENTS[type].brand === 'optional'
        ? [Validators.maxLength(30)]
        : [Validators.required, Validators.maxLength(30)],
    );
    brand.updateValueAndValidity({ emitEvent: false });

    this.form.updateValueAndValidity();
  }

  private plateTaken(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return value && this.registrations.isPlateTaken(value) ? { plateTaken: true } : null;
  }

  private rewrite(field: 'plate' | 'documentNumber' | 'frameSerial', transform: (value: string) => string): void {
    const control = this.form.controls[field];
    const next = transform(control.value);

    if (next !== control.value) {
      control.setValue(next);
    }
  }

  private goTo(step: Step): void {
    this.step.set(step);
    // El título del paso recibe el foco: el lector de pantalla anuncia dónde está.
    afterNextRender(() => document.getElementById('step-title')?.focus(), { injector: this.injector });
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => document.querySelector<HTMLElement>('.register [aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
