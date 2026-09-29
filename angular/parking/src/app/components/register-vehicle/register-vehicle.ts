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
  MAX_VEHICLES_PER_USER,
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
  type RegistrationDocument,
  type VehicleRegistration,
  latestReview,
} from '../../core/models/vehicle-registration';
import { AuthService } from '../../core/services/auth.service';
import { VehiclesApiService } from '../../core/services/modules/vehicles-student-panel/vehicles-api.sp.service';
import { StudentsService } from '../../core/services/students.service';
import { UploadService } from '../../core/services/upload.service';
import {
  RegistrationError,
  VehicleRegistrationService,
} from '../../core/services/vehicle-registration.service';

type Step = 'type' | 'details' | 'documents' | 'review' | 'done';

const STEPS: readonly { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'type', label: 'Vehículo' },
  { id: 'details', label: 'Datos' },
  { id: 'documents', label: 'Documentos' },
  { id: 'review', label: 'Confirmar' },
];

const TYPE_OPTIONS: readonly { value: VehicleType; description: string }[] = [
  { value: 'moto', description: 'Datos del vehículo y foto de la tarjeta de propiedad.' },
  { value: 'bicicleta', description: 'Marca, color y, si lo tiene, el serial del marco.' },
  { value: 'scooter', description: 'Marca, color y, si la tienes, la factura de compra.' },
];

type FieldName = 'plate' | 'brand' | 'line' | 'modelYear' | 'color' | 'frameSerial';

/** Qué campos pide cada vehículo. Los demás se deshabilitan y no cuentan. */
const FIELDS_BY_TYPE: Record<VehicleType, readonly FieldName[]> = {
  moto: ['plate', 'brand', 'line', 'modelYear', 'color'],
  bicicleta: ['brand', 'color', 'frameSerial'],
  scooter: ['brand', 'color'],
};

const ALL_FIELDS: readonly FieldName[] = [
  'plate',
  'brand',
  'line',
  'modelYear',
  'color',
  'frameSerial',
];

/** Placa de moto colombiana. La letra final es opcional en motos antiguas. */
const PLATE_PATTERN = /^[A-Z]{3}\d{2}[A-Z]?$/;
const SERIAL_PATTERN = /^[A-Z0-9-]{4,30}$/;
const CURRENT_YEAR = new Date().getFullYear();

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  plate: 'Escribe la placa.',
  brand: 'Escribe la marca.',
  line: 'Escribe la línea, como aparece en la tarjeta.',
  modelYear: 'Escribe el año del modelo.',
  color: 'Escribe el color.',
  frameSerial: '',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  plate: 'Usa el formato de placa de moto: ABC12D.',
  frameSerial: 'Usa solo letras, números y guiones (4 a 30 caracteres).',
};

/**
 * Registro de vehículos institucionales, en cuatro pasos (tipo, datos,
 * documentos, confirmar). El dueño sale de la cuenta con sesión, no de un
 * formulario (ya no se pide "Tus datos").
 *
 * La solicitud —con su cola de aprobación y sus documentos— sigue viviendo en
 * `VehicleRegistrationService` (demostración): el backend real no tiene
 * ninguna de las dos cosas todavía (PEN-020 en planeacion-desarrollo.md). Al
 * enviarla, `submit()` además crea el vehículo de verdad en el backend real
 * (`VehiclesApiService.postCreate`, mismo servicio y mismo patrón que
 * `VisitorApiService`), con los campos que hoy acepta: tipo, marca, color,
 * modelo (año) y placa. Esa segunda llamada es "best effort": si falla, no
 * bloquea ni muestra error, para no depender de que el backend esté
 * disponible en ese momento.
 *
 * El dueño que se manda en esa llamada sale de `AuthService.effectiveUid()`:
 * el uid real de la cuenta con sesión abierta.
 *
 * El tope de {@link MAX_VEHICLES_PER_USER} vehículos se evalúa contra los
 * vehículos reales del usuario (`StudentsService`, compartido con
 * `MainDashboard` y `Vehicles`; el mismo `GET /users/:id` que alimenta "Mis
 * vehículos" en el dashboard) — no contra cuántas solicitudes de demostración
 * existan en `VehicleRegistrationService`. Antes eran el mismo número; ahora
 * que "Mis vehículos" sale del backend real, comparar contra la demo
 * bloqueaba (o dejaba pasar) según datos que ya no tienen relación con lo que
 * el usuario ve en su propio dashboard.
 */
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
  private readonly vehicleApi = inject(VehiclesApiService);
  private readonly studentsService = inject(StudentsService);
  private readonly uploads = inject(UploadService);
  private readonly injector = inject(Injector);
  private readonly fb = inject(FormBuilder);

  protected readonly brand = BRAND;
  protected readonly steps = STEPS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly vehicleLabel = vehicleLabel;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;
  protected readonly documentLabels = DOCUMENT_LABELS;
  protected readonly maxYear = CURRENT_YEAR + 1;

  // ---- Tope de vehículos (contra el backend real, no contra la demo) -----------
  protected readonly maxVehicles = MAX_VEHICLES_PER_USER;
  protected readonly vehiclesCountLoading = this.studentsService.loading;
  protected readonly canRegisterMore = computed(
    () => this.studentsService.vehicles().length < this.maxVehicles,
  );

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
    plate: [
      '',
      [
        Validators.required,
        Validators.pattern(PLATE_PATTERN),
        (control: AbstractControl) => this.plateTaken(control),
      ],
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

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );

  protected readonly detailsAttempted = signal(false);

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
    this.requirements().filter(
      (requirement) => requirement.required && !this.documents()[requirement.kind],
    ),
  );

  // ---- Envío -----------------------------------------------------------------------------------

  protected readonly declarationAccepted = signal(false);
  protected readonly declarationAttempted = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitted = signal<VehicleRegistration | null>(null);

  protected readonly summaryVehicle = computed(() => {
    this.formValue();
    return this.vehicleType() ? this.buildVehicle() : null;
  });

  constructor() {
    this.syncEnabledFields(null);
    // Cuántos vehículos institucionales tiene de verdad el usuario (StudentsService,
    // compartido con MainDashboard y Vehicles), para decidir si puede seguir con el
    // registro. Falla abierto: si la consulta falla, `canRegisterMore` queda en true
    // (`vehicles()` sigue vacío) y no bloquea el registro por un problema de red — el
    // tope de MAX_VEHICLES_PER_USER es una regla del frontend, el backend no la exige
    // todavía (PEN-020).
    void this.studentsService.refresh().catch(() => {});
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
    const previous: Partial<Record<Step, Step>> = {
      details: 'type',
      documents: 'details',
      review: 'documents',
    };
    const target = previous[this.step()];

    if (target) {
      this.goTo(target);
    }
  }

  protected toggleDeclaration(event: Event): void {
    this.declarationAccepted.set((event.target as HTMLInputElement).checked);
  }

  protected async submit(): Promise<void> {
    this.declarationAttempted.set(true);
    this.submitError.set(null);

    if (!this.declarationAccepted()) {
      return;
    }

    const vehicle = this.buildVehicle();
    let registration: VehicleRegistration;

    try {
      registration = this.registrations.submit({
        owner: this.buildOwner(),
        vehicle,
        documents: Object.values(this.documents()),
      });

      this.submitted.set(registration);
      this.goTo('done');
    } catch (error) {
      this.submitError.set(
        error instanceof RegistrationError
          ? error.message
          : 'No pudimos enviar la solicitud. Inténtalo de nuevo.',
      );
      return;
    }

    // La solicitud (con su aprobación y sus documentos) sigue siendo la fuente
    // de verdad de esta pantalla: el backend real todavía no tiene ninguna de
    // las dos cosas (PEN-020). Además de eso, se crea el vehículo de verdad
    // con lo que el backend sí acepta hoy — sin bloquear ni mostrar error si
    // falla, para no depender de que el backend esté disponible en este momento.
    // El resultado de este intento (éxito o fallo) queda en la propia
    // solicitud (`backendVehicleCreation`): antes no había forma de saberlo
    // mirándola después.
    try {
      const created = await this.vehicleApi.postCreate({
        type: vehicle.type,
        brand: vehicle.brand ?? '',
        model: vehicle.modelYear ?? CURRENT_YEAR,
        color: vehicle.color ?? '',
        ownerUid: this.auth.effectiveUid(),
        ...(vehicle.plate ? { plate: vehicle.plate } : {}),
      });
      this.registrations.markBackendVehicleCreation(registration.id, {
        status: 'created',
        vehicleId: created.plate,
      });
    } catch (error) {
      console.error(
        'No se pudo crear el vehículo en el backend real (la solicitud sí quedó guardada):',
        error,
      );
      this.registrations.markBackendVehicleCreation(registration.id, { status: 'failed' });
    }

    // Se acaba de crear (o al menos intentar) un vehículo real: el tope de la
    // próxima vez que se entre a este formulario debe reflejarlo.
    void this.studentsService.refresh().catch(() => {});
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
        error instanceof RegistrationError
          ? error.message
          : 'No pudimos enviar el documento. Inténtalo de nuevo.',
      );
    }
  }

  /**
   * Ya no se le pide a la persona que vuelva a escribir su nombre: sale tal
   * cual de la cuenta con la que inició sesión (se quitó el paso "Tus datos",
   * que lo pedía y lo comparaba contra la cuenta a mano).
   */
  private buildOwner(): DeclaredOwner {
    const [firstName, ...rest] = (this.auth.user()?.displayName ?? '').trim().split(/\s+/);
    return { firstName: firstName ?? '', lastName: rest.join(' ') };
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

  private rewrite(field: 'plate' | 'frameSerial', transform: (value: string) => string): void {
    const control = this.form.controls[field];
    const next = transform(control.value);

    if (next !== control.value) {
      control.setValue(next);
    }
  }

  private goTo(step: Step): void {
    this.step.set(step);
    // El título del paso recibe el foco: el lector de pantalla anuncia dónde está.
    afterNextRender(() => document.getElementById('step-title')?.focus(), {
      injector: this.injector,
    });
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => document.querySelector<HTMLElement>('.page [aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
