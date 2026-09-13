import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { seedRegistrations } from '../demo/seed-registrations';
import { MAX_VEHICLES_PER_USER, type Vehicle } from '../models/vehicle';
import {
  DOCUMENT_LABELS,
  type DeclaredOwner,
  type DocumentKind,
  type RegistrationDocument,
  type RegistrationStatus,
  type ReviewDecision,
  type VehicleRegistration,
  missingRequiredDocuments,
} from '../models/vehicle-registration';
import { createId } from '../utils/id';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface RegistrationInput {
  owner: DeclaredOwner;
  vehicle: Vehicle;
  documents: RegistrationDocument[];
}

export type RegistrationErrorCode =
  | 'not-signed-in'
  | 'forbidden'
  | 'not-found'
  | 'limit-reached'
  | 'plate-taken'
  | 'missing-documents'
  | 'invalid-state';

export class RegistrationError extends Error {
  constructor(
    readonly code: RegistrationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const STORAGE_KEY = 'registrations';

/** "una moto KZT45F", "una bicicleta Bianchi", "un scooter". */
export function vehiclePhrase(vehicle: Vehicle): string {
  const noun = { moto: 'una moto', bicicleta: 'una bicicleta', scooter: 'un scooter' }[vehicle.type];
  const detail = vehicle.plate ?? vehicle.brand;

  return detail ? `${noun} ${detail}` : noun;
}

/**
 * Solicitudes de registro de vehículos: las crea el usuario y las resuelve la
 * administración. Es la única fuente de verdad de "Mis vehículos".
 *
 * TODO: en demostración vive en el navegador. Con Firebase, cada método será
 * una escritura en Firestore protegida por reglas: el cliente nunca debe poder
 * aprobar su propia solicitud, por mucho que la interfaz no lo permita.
 */
@Injectable({ providedIn: 'root' })
export class VehicleRegistrationService {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  private readonly _items = signal<VehicleRegistration[]>(
    loadDemo<VehicleRegistration[]>(STORAGE_KEY) ?? seedRegistrations(),
  );

  readonly all = this._items.asReadonly();

  /** Cola de revisión: primero lo que más tiempo lleva esperando. */
  readonly pending = computed(() => this.byStatus('pending', 'oldest'));
  readonly needsUpdate = computed(() => this.byStatus('needs-update', 'oldest'));
  readonly approved = computed(() => this.byStatus('approved', 'newest'));
  readonly rejected = computed(() => this.byStatus('rejected', 'newest'));

  /** Solicitudes de quien tiene la sesión abierta, en el orden en que las envió. */
  readonly mine = computed(() => {
    const uid = this.auth.user()?.uid;

    return uid
      ? this._items()
          .filter((item) => item.applicant.uid === uid)
          .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
      : [];
  });

  readonly maxPerUser = MAX_VEHICLES_PER_USER;
  readonly canRegisterMore = computed(() => this.mine().length < MAX_VEHICLES_PER_USER);

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._items()));
  }

  find(id: string | null | undefined): VehicleRegistration | undefined {
    return id ? this._items().find((item) => item.id === id) : undefined;
  }

  /**
   * Una placa solo puede estar en una solicitud viva a la vez. Las rechazadas
   * no cuentan: la persona debe poder volver a intentarlo.
   */
  isPlateTaken(plate: string, exceptId?: string): boolean {
    const normalized = plate.trim().toUpperCase();

    return this._items().some(
      (item) =>
        item.id !== exceptId &&
        item.status !== 'rejected' &&
        item.vehicle.plate?.toUpperCase() === normalized,
    );
  }

  submit(input: RegistrationInput): VehicleRegistration {
    const user = this.auth.user();

    if (!user) {
      throw new RegistrationError('not-signed-in', 'Inicia sesión para registrar un vehículo.');
    }

    if (!this.canRegisterMore()) {
      throw new RegistrationError(
        'limit-reached',
        `Ya tienes ${MAX_VEHICLES_PER_USER} vehículos registrados. Elimina uno para registrar otro.`,
      );
    }

    if (input.vehicle.plate && this.isPlateTaken(input.vehicle.plate)) {
      throw new RegistrationError('plate-taken', `La placa ${input.vehicle.plate} ya está registrada.`);
    }

    if (missingRequiredDocuments(input.vehicle.type, input.documents).length) {
      throw new RegistrationError('missing-documents', 'Faltan documentos obligatorios.');
    }

    const now = new Date();
    const registration: VehicleRegistration = {
      id: createId('reg'),
      applicant: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        affiliation: user.affiliation,
        program: user.program,
      },
      owner: input.owner,
      vehicle: input.vehicle,
      documents: input.documents,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
      reviews: [],
    };

    this._items.update((items) => [...items, registration]);

    this.notifications.notify({
      kind: 'registration',
      audience: 'admins',
      title: 'Nueva solicitud de registro',
      message: `${user.displayName} registró ${vehiclePhrase(input.vehicle)}.`,
      link: `/admin/pendientes?solicitud=${registration.id}`,
    });

    return registration;
  }

  approve(id: string): void {
    const registration = this.decide(id, { outcome: 'approved' });

    this.notifications.notify({
      kind: 'vehicle',
      audience: registration.applicant.uid,
      title: 'Vehículo aprobado',
      message: `Tu registro de ${vehiclePhrase(registration.vehicle)} fue aprobado. Ya puede ingresar al parqueadero.`,
      link: '/inicio',
    });
  }

  reject(id: string, reason: string, note?: string): void {
    const registration = this.decide(id, { outcome: 'rejected', reason, note });

    this.notifications.notify({
      kind: 'vehicle',
      audience: registration.applicant.uid,
      title: 'Registro rechazado',
      message: `Tu registro de ${vehiclePhrase(registration.vehicle)} fue rechazado: ${reason.toLowerCase()}.`,
      link: '/inicio',
    });
  }

  requestUpdate(id: string, documentKind: DocumentKind, note: string): void {
    const registration = this.decide(id, { outcome: 'needs-update', documentKind, note });

    this.notifications.notify({
      kind: 'vehicle',
      audience: registration.applicant.uid,
      title: 'Actualiza un documento',
      message: `Para aprobar ${vehiclePhrase(registration.vehicle)} necesitamos de nuevo: ${DOCUMENT_LABELS[documentKind].toLowerCase()}.`,
      link: `/vehiculos/registrar?actualizar=${registration.id}`,
    });
  }

  /** El usuario reemplaza los documentos que se le pidieron y vuelve a la cola. */
  resubmit(id: string, documents: RegistrationDocument[]): void {
    const registration = this.requireOwn(id);

    if (registration.status !== 'needs-update') {
      throw new RegistrationError('invalid-state', 'Esta solicitud no espera documentos nuevos.');
    }

    const replaced = new Set(documents.map((document) => document.kind));
    const merged = [...registration.documents.filter((document) => !replaced.has(document.kind)), ...documents];

    this.replace({ ...registration, documents: merged, status: 'pending', updatedAt: new Date() });

    const names = documents.map((document) => DOCUMENT_LABELS[document.kind].toLowerCase()).join(' y ');

    this.notifications.notify({
      kind: 'registration',
      audience: 'admins',
      title: 'Documentos actualizados',
      message: `${registration.applicant.displayName} volvió a enviar ${names} de ${vehiclePhrase(registration.vehicle)}.`,
      link: `/admin/pendientes?solicitud=${registration.id}`,
    });
  }

  /** Libera el cupo. El historial de entradas y salidas no se toca. */
  remove(id: string): void {
    this.requireOwn(id);
    this._items.update((items) => items.filter((item) => item.id !== id));
  }

  private decide(id: string, decision: Omit<ReviewDecision, 'reviewer' | 'decidedAt'>): VehicleRegistration {
    const user = this.auth.user();

    if (user?.role !== 'admin') {
      throw new RegistrationError('forbidden', 'Solo la administración puede revisar solicitudes.');
    }

    const registration = this.find(id);

    if (!registration) {
      throw new RegistrationError('not-found', 'La solicitud ya no existe.');
    }

    if (registration.status !== 'pending') {
      throw new RegistrationError('invalid-state', 'Esta solicitud ya fue revisada.');
    }

    const now = new Date();
    const updated: VehicleRegistration = {
      ...registration,
      status: decision.outcome as RegistrationStatus,
      updatedAt: now,
      reviews: [...registration.reviews, { ...decision, reviewer: user.displayName, decidedAt: now }],
    };

    this.replace(updated);
    return updated;
  }

  private requireOwn(id: string): VehicleRegistration {
    const registration = this.find(id);

    if (!registration) {
      throw new RegistrationError('not-found', 'La solicitud ya no existe.');
    }

    if (registration.applicant.uid !== this.auth.user()?.uid) {
      throw new RegistrationError('forbidden', 'Esta solicitud pertenece a otra persona.');
    }

    return registration;
  }

  private replace(updated: VehicleRegistration): void {
    this._items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  private byStatus(status: RegistrationStatus, order: 'oldest' | 'newest'): VehicleRegistration[] {
    const direction = order === 'oldest' ? 1 : -1;

    return this._items()
      .filter((item) => item.status === status)
      .sort((a, b) => direction * (a.updatedAt.getTime() - b.updatedAt.getTime()));
  }
}
