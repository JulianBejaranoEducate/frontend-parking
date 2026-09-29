import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Injector, afterNextRender, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormBuilder, ReactiveFormsModule, type ValidationErrors, Validators } from '@angular/forms';
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
import { VehiclesApiService } from '../../core/services/api/vehicles-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { StudentVehiclesService } from '../../core/services/student-panel/student-vehicles.service';

type Step = 'type' | 'details' | 'review' | 'done';

const STEPS: readonly { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'type', label: 'Vehículo' },
  { id: 'details', label: 'Datos' },
  { id: 'review', label: 'Confirmar' },
];

const TYPE_OPTIONS: readonly { value: VehicleType; description: string }[] = [
  { value: 'moto', description: 'Placa, marca, modelo y color.' },
  { value: 'bicicleta', description: 'Marca y color.' },
  { value: 'scooter', description: 'Marca y color.' },
];

type FieldName = 'plate' | 'brand' | 'modelYear' | 'color';

/** Qué campos pide cada vehículo: son los que guarda el backend. Los demás se deshabilitan. */
const FIELDS_BY_TYPE: Record<VehicleType, readonly FieldName[]> = {
  moto: ['plate', 'brand', 'modelYear', 'color'],
  bicicleta: ['brand', 'color'],
  scooter: ['brand', 'color'],
};

const ALL_FIELDS: readonly FieldName[] = ['plate', 'brand', 'modelYear', 'color'];

/** Placa de moto colombiana. La letra final es opcional en motos antiguas. */
const PLATE_PATTERN = /^[A-Z]{3}\d{2}[A-Z]?$/;
const CURRENT_YEAR = new Date().getFullYear();

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  plate: 'Escribe la placa.',
  brand: 'Escribe la marca.',
  modelYear: 'Escribe el año del modelo.',
  color: 'Escribe el color.',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  plate: 'Usa el formato de placa de moto: ABC12D.',
};

/**
 * Registro de un vehículo de la comunidad en tres pasos (tipo, datos,
 * confirmar). Al confirmar se crea en el backend (`POST /vehicles`) a nombre de
 * quien tiene la sesión, sin permiso para entrar: la administración lo aprueba
 * después desde su panel.
 *
 * El tope de {@link MAX_VEHICLES_PER_USER} vehículos se evalúa contra los
 * vehículos reales de la persona (`StudentVehiclesService`).
 */
@Component({
  imports: [NgTemplateOutlet, ReactiveFormsModule, RouterLink],
  selector: 'app-register-vehicle',
  styleUrl: './register-vehicle.css',
  templateUrl: './register-vehicle.html',
})
export class RegisterVehicle {
  private readonly auth = inject(AuthService);
  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly studentVehicles = inject(StudentVehiclesService);
  private readonly injector = inject(Injector);
  private readonly fb = inject(FormBuilder);

  protected readonly brand = BRAND;
  protected readonly steps = STEPS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly vehicleLabel = vehicleLabel;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;
  protected readonly maxYear = CURRENT_YEAR + 1;

  // ---- Tope de vehículos --------------------------------------------------------------

  protected readonly maxVehicles = MAX_VEHICLES_PER_USER;
  protected readonly vehiclesCountLoading = this.studentVehicles.loading;
  protected readonly canRegisterMore = computed(() => this.studentVehicles.vehicles().length < this.maxVehicles);

  // ---- Pasos ----------------------------------------------------------------------------

  protected readonly step = signal<Step>('type');
  protected readonly stepIndex = computed(() => STEPS.findIndex((item) => item.id === this.step()));
  protected readonly vehicleType = linkedSignal<VehicleType | null>(() => null);
  protected readonly showTypeError = signal(false);

  // ---- Datos ------------------------------------------------------------------------------

  protected readonly form = this.fb.nonNullable.group({
    plate: ['', [Validators.required, Validators.pattern(PLATE_PATTERN), (control: AbstractControl) => this.plateTaken(control)]],
    brand: ['', [Validators.required, Validators.maxLength(30)]],
    modelYear: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1970),
      Validators.max(CURRENT_YEAR + 1),
    ]),
    color: ['', [Validators.required, Validators.maxLength(30)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly detailsAttempted = signal(false);

  // ---- Envío ------------------------------------------------------------------------------

  protected readonly declarationAccepted = signal(false);
  protected readonly declarationAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  /** El vehículo tal como quedó registrado. */
  protected readonly submitted = signal<Vehicle | null>(null);

  protected readonly summaryVehicle = computed(() => {
    this.formValue();
    return this.vehicleType() ? this.buildVehicle() : null;
  });

  constructor() {
    this.syncEnabledFields(null);
    // Si la consulta falla, `vehicles()` sigue vacío y no bloquea el registro por un problema de red.
    void this.studentVehicles.refresh().catch(() => {});
  }

  // ---- Navegación ---------------------------------------------------------------------------

  protected chooseType(type: VehicleType): void {
    if (this.vehicleType() !== type) {
      this.vehicleType.set(type);
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

    this.goTo('review');
  }

  protected back(): void {
    const previous: Partial<Record<Step, Step>> = { details: 'type', review: 'details' };
    const target = previous[this.step()];

    if (target) {
      this.goTo(target);
    }
  }

  protected toggleDeclaration(event: Event): void {
    this.declarationAccepted.set((event.target as HTMLInputElement).checked);
  }

  /** Crea el vehículo en el backend. Si falla, se queda en este paso con el motivo. */
  protected async submit(): Promise<void> {
    this.declarationAttempted.set(true);
    this.submitError.set(null);

    if (!this.declarationAccepted() || this.submitting()) {
      return;
    }

    const vehicle = this.buildVehicle();
    this.submitting.set(true);

    try {
      await this.vehiclesApi.create({
        type: vehicle.type,
        brand: vehicle.brand ?? '',
        // El backend exige el año del modelo; solo la moto lo pide en el formulario.
        model: vehicle.modelYear ?? CURRENT_YEAR,
        color: vehicle.color ?? '',
        ownerUid: this.auth.effectiveUid(),
        ...(vehicle.plate ? { plate: vehicle.plate } : {}),
      });

      this.submitted.set(vehicle);
      this.goTo('done');
      void this.studentVehicles.refresh().catch(() => {});
    } catch (error) {
      this.submitError.set(this.backendMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /** Empieza de cero para registrar otro vehículo. */
  protected startOver(): void {
    this.form.reset();
    this.vehicleType.set(null);
    this.declarationAccepted.set(false);
    this.declarationAttempted.set(false);
    this.detailsAttempted.set(false);
    this.submitted.set(null);
    this.syncEnabledFields(null);
    this.goTo('type');
  }

  // ---- Normalización mientras se escribe ---------------------------------------------------

  protected normalizePlate(): void {
    const control = this.form.controls.plate;
    const next = control.value.toUpperCase().replace(/[\s-]/g, '');

    if (next !== control.value) {
      control.setValue(next);
    }
  }

  // ---- Presentación --------------------------------------------------------------------------

  protected shows(field: FieldName): boolean {
    const type = this.vehicleType();
    return type ? FIELDS_BY_TYPE[type].includes(field) : false;
  }

  /** true si el campo se puede dejar vacío para el tipo elegido. */
  protected isOptional(field: 'brand' | 'color'): boolean {
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
      return 'Ya registraste un vehículo con esta placa.';
    }

    if (errors['pattern']) {
      return PATTERN_MESSAGES[field] ?? 'Revisa el formato.';
    }

    if (errors['min'] || errors['max']) {
      return `Escribe un año entre 1970 y ${CURRENT_YEAR + 1}.`;
    }

    if (errors['maxlength']) {
      return `No puede superar los ${errors['maxlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este dato.';
  }

  // ---- Internos ------------------------------------------------------------------------------

  private buildVehicle(): Vehicle {
    const value = this.form.getRawValue();
    const vehicle: Vehicle = { type: this.vehicleType() ?? 'moto' };

    if (this.shows('plate')) {
      vehicle.plate = value.plate;
    }

    if (this.shows('brand') && value.brand.trim()) {
      vehicle.brand = value.brand.trim();
    }

    if (this.shows('modelYear') && value.modelYear !== null) {
      vehicle.modelYear = Number(value.modelYear);
    }

    if (this.shows('color')) {
      vehicle.color = value.color.trim();
    }

    return vehicle;
  }

  /** Habilita solo los campos del tipo elegido y ajusta si la marca es obligatoria. */
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

  /** Placa repetida entre los vehículos de la persona; el backend rechaza además las de otras cuentas. */
  private plateTaken(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return value && this.studentVehicles.vehicles().some((vehicle) => vehicle.id === value) ? { plateTaken: true } : null;
  }

  /** El backend explica en `details` (o en `detail`, si es de validación) por qué rechazó el registro. */
  private backendMessage(error: unknown): string {
    const body = error instanceof HttpErrorResponse ? error.error : null;
    const detail = body?.details ?? body?.detail?.[0]?.message;
    return typeof detail === 'string'
      ? `No pudimos registrar el vehículo: ${detail}`
      : 'No pudimos registrar el vehículo. Revisa tu conexión e inténtalo de nuevo.';
  }

  private goTo(step: Step): void {
    this.step.set(step);
    // El título del paso recibe el foco: el lector de pantalla anuncia dónde está.
    afterNextRender(() => document.getElementById('step-title')?.focus(), { injector: this.injector });
  }

  private focusFirstInvalid(): void {
    afterNextRender(() => document.querySelector<HTMLElement>('.page [aria-invalid="true"]')?.focus(), {
      injector: this.injector,
    });
  }
}
