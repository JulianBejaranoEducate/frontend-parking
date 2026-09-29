import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import {
  DOCUMENT_TYPES,
  VEHICLE_TYPES,
  type DocumentType,
  type VehicleType,
  type VisitorRegistration,
  vehicleLabel,
} from '../../core/models/visitor-pass';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';

/**
 * Placa: 3 letras y 3 números exactos (así la exige hoy el backend en
 * `Visitor.validation.ts`; distinto del formato de motos institucionales).
 */
const PLATE_PATTERN = /^[A-Z]{3}[0-9]{3}$/;

/** Cédulas y tarjetas de identidad colombianas: solo dígitos, de 6 a 11. */
const DOCUMENT_NUMBER_PATTERN = /^\d{6,11}$/;

type FieldName =
  | 'firstName'
  | 'lastName'
  | 'documentType'
  | 'documentNumber'
  | 'vehicleType'
  | 'vehicleBrand'
  | 'vehicleColor'
  | 'plate'
  | 'reason';

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  firstName: 'Escribe tu nombre.',
  lastName: 'Escribe tu apellido.',
  documentType: 'Selecciona un tipo de documento.',
  documentNumber: 'Escribe tu número de documento.',
  vehicleType: 'Selecciona el tipo de vehículo.',
  vehicleBrand: 'Escribe la marca del vehículo.',
  vehicleColor: 'Escribe el color del vehículo.',
  plate: 'Escribe la placa de la moto.',
  reason: 'Cuéntanos el motivo de tu visita.',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  documentNumber: 'Debe tener entre 6 y 11 dígitos, sin puntos ni espacios.',
  plate: 'Usa el formato ABC123 (3 letras y 3 números).',
};

/**
 * Registro de visitantes (fase de conexión; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * Enviar este formulario solo registra la visita: todavía no es un ingreso
 * (la persona puede registrarse y al final no entrar). El QR lleva el id que el
 * backend le asignó al registro y es la llave de acceso: el ingreso queda
 * validado cuando portería lo escanea, y la salida cuando el guardia la
 * registra (ADR-021).
 *
 * El backend pide siempre marca, color y modelo del vehículo (sin excepción
 * por tipo) y no acepta serial de marco; la placa es la única opcional, y
 * aquí solo se pide para motos porque son las que físicamente la llevan.
 */
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-visitor',
  styleUrl: './visitor.css',
  templateUrl: './visitor.html',
})
export class Visitor {
  private readonly fb = inject(FormBuilder);
  private readonly visitorApi = inject(VisitorApiService);

  protected readonly brand = BRAND;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly vehicleTypes = VEHICLE_TYPES;
  /** El backend guarda el tipo como texto suelto (lo valida Joi, no TypeScript). */
  protected readonly vehicleLabel = (type: string) => vehicleLabel(type as VehicleType);

  /** Se activa al primer intento de envío para revelar todos los errores. */
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  /** Error de red o del backend al registrar la visita. */
  protected readonly submitError = signal<string | null>(null);

  /** Cuando existe, la pantalla muestra el QR en vez del formulario. */
  protected readonly visitor = signal<BackendVisitor | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    documentType: ['', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(DOCUMENT_NUMBER_PATTERN)]],
    vehicleType: ['', Validators.required],
    vehicleBrand: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
    vehicleColor: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    // Solo obligatoria cuando el tipo elegido es moto (ver toggleVehicleType()).
    plate: [''],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
  });

  /** Placa obligatoria únicamente para moto; los demás tipos no la llevan. */
  protected onVehicleTypeChange(): void {
    const control = this.form.controls.plate;
    const isMoto = this.form.controls.vehicleType.value === 'moto';

    if (isMoto) {
      control.setValidators([Validators.required, Validators.pattern(PLATE_PATTERN)]);
    } else {
      control.clearValidators();
      control.setValue('', { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  /** Las placas se guardan siempre en mayúsculas, se escriban como se escriban. */
  protected normalizePlate(): void {
    const control = this.form.controls.plate;
    const next = control.value.toUpperCase().replace(/[\s-]/g, '');

    if (next !== control.value) {
      control.setValue(next, { emitEvent: false });
    }
  }

  /** El número de documento se escribe sin puntos ni separadores de miles. */
  protected normalizeDocumentNumber(): void {
    const control = this.form.controls.documentNumber;
    const next = control.value.replace(/\D/g, '');

    if (next !== control.value) {
      control.setValue(next, { emitEvent: false });
    }
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

  /** Vuelve al formulario en blanco para registrar a la siguiente visita. */
  protected registerAnother(): void {
    this.visitor.set(null);
    this.qrDataUrl.set(null);
    this.submitAttempted.set(false);
    this.submitError.set(null);
    this.form.reset();
  }

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const registration: VisitorRegistration = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      documentType: value.documentType as DocumentType,
      documentNumber: value.documentNumber,
      reason: value.reason.trim(),
      vehicle: {
        type: value.vehicleType as VehicleType,
        brand: value.vehicleBrand.trim(),
        color: value.vehicleColor.trim(),
        ...(value.plate ? { plate: value.plate } : {}),
      },
    };

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const backendVisitor = await this.visitorApi.create(registration);
      this.qrDataUrl.set(await this.visitorApi.renderQrCode(String(backendVisitor.id)));
      this.visitor.set(backendVisitor);
    } catch (error) {
      console.error('No se pudo registrar la visita en el backend:', error);
      this.submitError.set('No pudimos registrar tu visita. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
