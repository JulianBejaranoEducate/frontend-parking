import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type VisitorPass,
  type VisitorRegistration,
} from '../../core/models/visitor-pass';
import { PASS_TTL_MINUTES, VisitorPassService } from '../../core/services/visitor-pass.service';

/**
 * Placa colombiana: tres letras y tres caracteres.
 * Automóvil ABC123 y motocicleta ABC12D quedan cubiertos.
 */
const PLATE_PATTERN = /^[A-Z]{3}\d{2}[\dA-Z]$/;

/** Cédulas y tarjetas de identidad colombianas: solo dígitos, de 6 a 11. */
const DOCUMENT_NUMBER_PATTERN = /^\d{6,11}$/;

type FieldName = 'firstName' | 'lastName' | 'documentType' | 'documentNumber' | 'plate' | 'reason';

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  firstName: 'Escribe tu nombre.',
  lastName: 'Escribe tu apellido.',
  documentType: 'Selecciona un tipo de documento.',
  documentNumber: 'Escribe tu número de documento.',
  plate: 'Escribe la placa del vehículo.',
  reason: 'Cuéntanos el motivo de tu visita.',
};

const PATTERN_MESSAGES: Partial<Record<FieldName, string>> = {
  documentNumber: 'Debe tener entre 6 y 11 dígitos, sin puntos ni espacios.',
  plate: 'Usa el formato de placa colombiana: ABC123 o ABC12D.',
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

  protected readonly brand = BRAND;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly ttlMinutes = PASS_TTL_MINUTES;

  /** Se activa al primer intento de envío para revelar todos los errores. */
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);

  /** Cuando existe un pase, la pantalla muestra el QR en vez del formulario. */
  protected readonly pass = signal<VisitorPass | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  /**
   * Tapa el QR cuando la app pasa a segundo plano. No impide una captura de
   * pantalla — eso no se puede desde la web — pero evita que el código quede
   * a la vista en la miniatura del selector de aplicaciones.
   */
  protected readonly qrConcealed = signal(false);

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
    plate: ['', [Validators.required, Validators.pattern(PLATE_PATTERN)]],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
  });

  constructor() {
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

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    await this.issuePass({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      documentType: value.documentType as DocumentType,
      documentNumber: value.documentNumber,
      plate: value.plate,
      reason: value.reason.trim(),
    });
  }

  /**
   * Reemplaza un pase vencido. Es la salida de emergencia: el token anterior
   * queda inservible y solo el nuevo sirve en portería.
   */
  protected async regenerate(): Promise<void> {
    const current = this.pass();

    if (current) {
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

  private async issuePass(visitor: VisitorRegistration): Promise<void> {
    this.submitting.set(true);

    try {
      const pass = this.passes.issue(visitor);

      this.qrDataUrl.set(await this.passes.renderQrCode(pass.token));
      this.qrConcealed.set(false);
      this.pass.set(pass);
      this.startTimer();
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

  private rewrite(name: 'plate' | 'documentNumber', transform: (value: string) => string): void {
    const control = this.form.controls[name];
    const next = transform(control.value);

    if (next !== control.value) {
      control.setValue(next, { emitEvent: false });
    }
  }
}
