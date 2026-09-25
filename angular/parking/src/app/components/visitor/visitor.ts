import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, type ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type FieldRequirement,
  VEHICLE_TYPES,
  type VehicleType,
  type VisitorPass,
  type VisitorRegistration,
  type VisitorVehicle,
  isAsked,
  requirementsFor,
  vehicleLabel,
} from '../../core/models/visitor-pass';
import { PASS_TTL_MINUTES, VisitorPassService } from '../../core/services/visitor-pass.service';
import { VisitorApiService } from '../../core/services/visitor-api.service';

/**
 * Placa de moto colombiana: tres letras, dos dígitos y una letra final.
 * La letra final se dejó opcional porque las motos más antiguas no la llevan.
 * El formato de automóvil (ABC123) queda fuera a propósito: la universidad solo
 * tiene parqueadero para vehículos de dos ruedas.
 */
const PLATE_PATTERN = /^[A-Z]{3}\d{2}[A-Z]?$/;

/** Cédulas y tarjetas de identidad colombianas: solo dígitos, de 6 a 11. */
const DOCUMENT_NUMBER_PATTERN = /^\d{6,11}$/;

/** Serial del marco de una bicicleta: letras, números y guiones. */
const SERIAL_PATTERN = /^[A-Z0-9-]{4,30}$/;

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'documentType'
  | 'documentNumber'
  | 'vehicleType'
  | 'vehicleBrand'
  | 'vehicleColor'
  | 'plate'
  | 'frameSerial'
  | 'reason';

/** Campos del vehículo que dependen del tipo elegido. */
type VehicleField = 'vehicleBrand' | 'vehicleColor' | 'plate' | 'frameSerial';

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  firstName: 'Escribe tu nombre.',
  lastName: 'Escribe tu apellido.',
  documentType: 'Selecciona un tipo de documento.',
  documentNumber: 'Escribe tu número de documento.',
  vehicleType: 'Selecciona el tipo de vehículo.',
  vehicleBrand: 'Escribe la marca del vehículo.',
  vehicleColor: 'Escribe el color del vehículo.',
  plate: 'Escribe la placa de la moto.',
  frameSerial: '',
  reason: 'Cuéntanos el motivo de tu visita.',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  documentNumber: 'Debe tener entre 6 y 11 dígitos, sin puntos ni espacios.',
  plate: 'Usa el formato de placa de moto: ABC12D.',
  frameSerial: 'Usa solo letras, números y guiones (4 a 30 caracteres).',
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-visitor',
  styleUrl: './visitor.css',
  templateUrl: './visitor.html',
})
export class Visitor {
  private readonly fb = inject(FormBuilder);
  private readonly passes = inject(VisitorPassService);
  private readonly visitorApi = inject(VisitorApiService);

  protected readonly brand = BRAND;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly vehicleTypes = VEHICLE_TYPES;
  protected readonly ttlMinutes = PASS_TTL_MINUTES;
  protected readonly vehicleLabel = vehicleLabel;

  /** Se activa al primer intento de envío para revelar todos los errores. */
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  /** Error de red o del backend al registrar la visita (fase de conexión). */
  protected readonly submitError = signal<string | null>(null);

  /** Cuando existe un pase, la pantalla muestra el QR en vez del formulario. */
  protected readonly pass = signal<VisitorPass | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  /**
   * Tapa el QR cuando la app pasa a segundo plano. No impide una captura de
   * pantalla — eso no se puede desde la web — pero evita que el código quede
   * a la vista en la miniatura del selector de aplicaciones.
   */
  protected readonly qrConcealed = signal(false);

  /** Tipo de vehículo elegido: decide qué campos se piden y cuáles son obligatorios. */
  protected readonly vehicleType = signal<VehicleType | ''>('');
  protected readonly requires = computed(() => requirementsFor(this.vehicleType()));
  protected readonly isAsked = isAsked;

  private readonly now = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly remainingMs = computed(() => {
    const pass = this.pass();
    return pass ? Math.max(0, pass.expiresAt.getTime() - this.now()) : 0;
  });

  protected readonly expired = computed(() => this.pass() !== null && this.remainingMs() === 0);

  protected readonly countdown = computed(() => {
    const seconds = Math.ceil(this.remainingMs() / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  });

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    documentType: ['', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(DOCUMENT_NUMBER_PATTERN)]],
    vehicleType: ['', Validators.required],
    // Marca, color, placa y serial se validan según el vehículo: los validadores
    // se montan y desmontan en applyVehicleRules().
    vehicleBrand: [''],
    vehicleColor: [''],
    plate: [''],
    frameSerial: [''],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
  });

  constructor() {
    this.form.controls.vehicleType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.applyVehicleRules((type ?? '') as VehicleType | ''));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && this.pass()) {
        this.qrConcealed.set(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      this.stopTimer();
    });
  }

  /** Las placas se guardan siempre en mayúsculas, se escriban como se escriban. */
  protected normalizePlate(): void {
    this.rewrite('plate', (value) => value.toUpperCase().replace(/[\s-]/g, ''));
  }

  /** El número de documento se escribe sin puntos ni separadores de miles. */
  protected normalizeDocumentNumber(): void {
    this.rewrite('documentNumber', (value) => value.replace(/\D/g, ''));
  }

  /** El serial del marco se guarda en mayúsculas y sin espacios. */
  protected normalizeSerial(): void {
    this.rewrite('frameSerial', (value) => value.toUpperCase().replace(/\s/g, ''));
  }

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const requirements = this.requires();
    const vehicle: VisitorVehicle = { type: value.vehicleType as VehicleType };

    // Solo se guarda lo que ese vehículo pide, y los opcionales solo si se escribieron.
    const brand = value.vehicleBrand.trim();
    const color = value.vehicleColor.trim();

    if (isAsked(requirements.brand) && brand) {
      vehicle.brand = brand;
    }

    if (isAsked(requirements.color) && color) {
      vehicle.color = color;
    }

    if (isAsked(requirements.plate)) {
      vehicle.plate = value.plate;
    }

    if (isAsked(requirements.frameSerial) && value.frameSerial) {
      vehicle.frameSerial = value.frameSerial;
    }

    await this.issuePass({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      documentType: value.documentType as DocumentType,
      documentNumber: value.documentNumber,
      vehicle,
      reason: value.reason.trim(),
    });
  }

  /**
   * Reemplaza un pase vencido. Es la salida de emergencia: el token anterior
   * se anula y solo el nuevo sirve en portería.
   */
  protected async regenerate(): Promise<void> {
    const current = this.pass();

    if (current) {
      this.passes.revoke(current.token, 'Reemplazado por un pase nuevo');
      await this.issuePass(current.visitor);
    }
  }

  /** Vuelve al formulario en blanco para registrar a la siguiente persona. */
  protected registerAnother(): void {
    this.stopTimer();
    this.pass.set(null);
    this.qrDataUrl.set(null);
    this.qrConcealed.set(false);
    this.submitAttempted.set(false);
    this.form.reset();
  }

  protected revealQr(): void {
    this.qrConcealed.set(false);
  }

  protected isInvalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected errorFor(name: FieldName): string | null {
    const control = this.form.controls[name];

    if (!this.isInvalid(name) || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return REQUIRED_MESSAGES[name];
    }

    if (control.errors['pattern']) {
      return PATTERN_MESSAGES[name] ?? 'Revisa el formato de este dato.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['maxlength']) {
      return `No puede superar los ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este dato.';
  }

  /**
   * Monta los validadores del vehículo elegido y limpia los campos que ese
   * vehículo no usa, para que no arrastren un valor viejo hasta el pase.
   */
  private applyVehicleRules(type: VehicleType | ''): void {
    this.vehicleType.set(type);

    const requirements = requirementsFor(type);

    this.toggleControl('vehicleBrand', requirements.brand, [Validators.maxLength(30)]);
    this.toggleControl('vehicleColor', requirements.color, [Validators.maxLength(20)]);
    this.toggleControl('plate', requirements.plate, [Validators.pattern(PLATE_PATTERN)]);
    this.toggleControl('frameSerial', requirements.frameSerial, [Validators.pattern(SERIAL_PATTERN)]);
  }

  /**
   * Aplica el nivel de un campo: obligatorio suma `required` a sus validadores,
   * opcional deja solo el formato y «no se pide» lo vacía.
   */
  private toggleControl(name: VehicleField, requirement: FieldRequirement, validators: ValidatorFn[]): void {
    const control = this.form.controls[name];

    if (requirement === 'none') {
      control.clearValidators();
      control.setValue('', { emitEvent: false });
      control.markAsUntouched();
    } else {
      control.setValidators(requirement === 'required' ? [Validators.required, ...validators] : validators);
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Registra la visita en el backend real y arma el pase local a partir de la
   * respuesta (fase de conexión, resuelve COR-002 contra Postgres en vez del
   * navegador). El QR lleva el `id` que el backend le asignó al visitante: es
   * lo mismo que espera `GET /visitors/:id` cuando portería lo escanea.
   */
  private async issuePass(visitor: VisitorRegistration): Promise<void> {
    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const backendVisitor = await this.visitorApi.create(visitor);
      const issuedAt = new Date(backendVisitor.created_at);

      const pass: VisitorPass = {
        token: backendVisitor.id,
        visitor,
        issuedAt,
        // El backend no vence el pase: esto es solo un recordatorio para que
        // se muestre pronto, no algo que portería vaya a exigir.
        expiresAt: new Date(issuedAt.getTime() + PASS_TTL_MINUTES * 60_000),
        status: 'pending',
      };

      this.qrDataUrl.set(await this.passes.renderQrCode(pass.token));
      this.qrConcealed.set(false);
      this.pass.set(pass);
      this.startTimer();
    } catch (error) {
      console.error('No se pudo registrar la visita en el backend:', error);
      this.submitError.set('No pudimos registrar tu visita. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.now.set(Date.now());
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private rewrite(name: 'plate' | 'documentNumber' | 'frameSerial', transform: (value: string) => string): void {
    const control = this.form.controls[name];
    const next = transform(control.value);

    if (next !== control.value) {
      control.setValue(next, { emitEvent: false });
    }
  }
}
