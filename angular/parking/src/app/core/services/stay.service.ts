import { Injectable, computed, effect, signal } from '@angular/core';
import { PARKING, zoneFor } from '../config/parking.config';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { seedStays } from '../demo/seed-stays';
import {
  type MovementAnnulment,
  type MovementAudit,
  type ParkingStay,
  type ParkingZone,
  type StaySubject,
  isInside,
  movementsOf,
  occupancyByType,
} from '../models/parking';
import type { Vehicle } from '../models/vehicle';
import { createId } from '../utils/id';

const STORAGE_KEY = 'stays';

/**
 * Errores de coherencia de las estancias:
 * - already-inside: el vehículo ya tiene un ingreso abierto.
 * - not-found: la estancia no existe.
 * - already-exited: la estancia ya tenía salida.
 * - not-inside: no hay una salida que anular.
 * - already-annulled: el ingreso ya estaba anulado.
 */
export type StayErrorCode = 'already-inside' | 'not-found' | 'already-exited' | 'not-inside' | 'already-annulled';

/** Error de negocio al registrar, cerrar o anular una estancia. */
export class StayError extends Error {
  constructor(
    readonly code: StayErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Datos para registrar un ingreso. */
export interface EntryInput {
  vehicle: Vehicle;
  subject: StaySubject;
  audit: MovementAudit;
}

/**
 * Estancias del parqueadero: la única fuente de verdad de la ocupación y de los
 * movimientos (ADR-008).
 *
 * Cada estancia es un ingreso y, cuando ocurre, su salida. De aquí salen los
 * vehículos dentro, los cupos disponibles por tipo, la bitácora de movimientos
 * de portería y el historial de cada usuario.
 *
 * Este servicio solo cuida que los datos sean coherentes: un vehículo no puede
 * estar dentro dos veces y lo anulado no cuenta. Las reglas de portería (turno
 * activo, registro aprobado, avisos) las aplica `AccessControlService`.
 *
 * TODO: en demostración vive en el navegador. Con Firebase será una colección
 * de Firestore y cada ingreso o salida, una transacción en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class StayService {
  private readonly _stays = signal<ParkingStay[]>(loadDemo<ParkingStay[]>(STORAGE_KEY) ?? seedStays());

  /** Todas las estancias, incluidas las anuladas; la más reciente primero. */
  readonly stays = computed(() =>
    [...this._stays()].sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime()),
  );

  /** Vehículos dentro ahora mismo, del que más tiempo lleva al que acaba de entrar. */
  readonly inside = computed(() =>
    this._stays()
      .filter(isInside)
      .sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime()),
  );

  /** Vehículos dentro por tipo. */
  readonly insideByType = computed(() => occupancyByType(this.inside()));

  /** Cada cupo configurado con su ocupación actual, en el orden de la configuración. */
  readonly zones = computed<ParkingZone[]>(() =>
    PARKING.zones.map((zone) => ({ ...zone, occupied: this.insideByType()[zone.accepts] })),
  );

  /** Ingresos y salidas (también los anulados, marcados), del más reciente al más antiguo. */
  readonly movements = computed(() => movementsOf(this._stays()));

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._stays()));
  }

  /**
   * Busca una estancia por su id.
   *
   * @returns La estancia, o undefined si no existe.
   */
  find(stayId: string | null | undefined): ParkingStay | undefined {
    return stayId ? this._stays().find((stay) => stay.id === stayId) : undefined;
  }

  /**
   * Historial de una persona de la comunidad, sin las estancias anuladas.
   *
   * @param uid Cuenta institucional.
   * @returns Sus estancias, la más reciente primero.
   */
  staysOf(uid: string): ParkingStay[] {
    return this.stays().filter(
      (stay) => !stay.entryAnnulment && stay.subject.kind === 'institutional' && stay.subject.uid === uid,
    );
  }

  /**
   * Busca el ingreso abierto de un vehículo: por placa, por registro aprobado o
   * por pase de visitante.
   *
   * @returns La estancia en curso, o undefined si el vehículo está afuera.
   */
  openStayFor(vehicle: Vehicle, subject: StaySubject): ParkingStay | undefined {
    const plate = vehicle.plate?.toUpperCase();

    return this.inside().find((stay) => {
      if (plate && stay.vehicle.plate?.toUpperCase() === plate) {
        return true;
      }

      if (subject.kind === 'institutional' && stay.subject.kind === 'institutional') {
        return subject.registrationId !== null && stay.subject.registrationId === subject.registrationId;
      }

      return subject.kind === 'visitor' && stay.subject.kind === 'visitor' && stay.subject.passToken === subject.passToken;
    });
  }

  /**
   * Registra un ingreso.
   *
   * @param input Vehículo, persona y auditoría del guardia.
   * @param at Hora del ingreso; por defecto, ahora.
   * @returns La estancia creada.
   * @throws StayError `already-inside` si el vehículo ya tiene un ingreso abierto.
   */
  registerEntry(input: EntryInput, at: Date = new Date()): ParkingStay {
    if (this.openStayFor(input.vehicle, input.subject)) {
      throw new StayError('already-inside', 'Este vehículo ya tiene un ingreso abierto.');
    }

    return this.add(this.newStay(input, at));
  }

  /**
   * Registra la salida de una estancia abierta.
   *
   * @param stayId Estancia que termina.
   * @param audit Guardia, turno y método con que se identificó la salida.
   * @param at Hora de la salida; por defecto, ahora.
   * @returns La estancia cerrada.
   * @throws StayError `not-found` si la estancia no existe, o `already-exited` si ya tenía salida.
   */
  registerExit(stayId: string, audit: MovementAudit, at: Date = new Date()): ParkingStay {
    const stay = this.requireOpen(stayId);
    return this.replace({ ...stay, exitedAt: at, exit: audit });
  }

  /**
   * Registra la salida de un vehículo que no tiene ingreso en el sistema (4.6).
   * Queda como una estancia de duración cero marcada para revisión.
   *
   * @param input Vehículo, persona y auditoría; la nota del guardia debe explicar el caso.
   * @param at Hora de la salida; por defecto, ahora.
   * @throws StayError `already-inside` si en realidad el vehículo sí tiene un ingreso abierto.
   */
  registerExitWithoutEntry(input: EntryInput, at: Date = new Date()): ParkingStay {
    if (this.openStayFor(input.vehicle, input.subject)) {
      throw new StayError('already-inside', 'Este vehículo tiene un ingreso abierto: registra la salida normal.');
    }

    const stay: ParkingStay = {
      ...this.newStay(input, at),
      exitedAt: at,
      exit: input.audit,
      flags: { missingEntry: true },
    };

    return this.add(stay);
  }

  /**
   * Cierra un ingreso viejo sin salida registrada, porque el vehículo vuelve a
   * entrar (4.6). La hora de salida es la del cierre y la estancia queda marcada.
   *
   * @param stayId Estancia abierta que se cierra.
   * @param audit Auditoría de quien la cierra.
   * @param at Momento del cierre; por defecto, ahora.
   */
  closeWithoutExit(stayId: string, audit: MovementAudit, at: Date = new Date()): ParkingStay {
    const stay = this.requireOpen(stayId);
    return this.replace({ ...stay, exitedAt: at, exit: audit, flags: { ...stay.flags, exitNotRecorded: true } });
  }

  /**
   * Anula el ingreso de una estancia: deja de contar para la ocupación y para el
   * historial, pero sigue en la bitácora marcada como anulada (ADR-018).
   *
   * @throws StayError `not-found` o `already-annulled`.
   */
  annulEntry(stayId: string, annulment: MovementAnnulment): ParkingStay {
    const stay = this.require(stayId);

    if (stay.entryAnnulment) {
      throw new StayError('already-annulled', 'Este ingreso ya estaba anulado.');
    }

    return this.replace({ ...stay, entryAnnulment: annulment });
  }

  /**
   * Anula la salida de una estancia y la deja abierta otra vez (ADR-018). Si la
   * estancia era solo una salida sin ingreso, se anula completa.
   *
   * @throws StayError `not-found`, `not-inside` si no tiene salida, `already-annulled`
   * si el ingreso ya estaba anulado, o `already-inside` si el vehículo tiene otro
   * ingreso abierto (hay que anular ese primero).
   */
  annulExit(stayId: string, annulment: MovementAnnulment): ParkingStay {
    const stay = this.require(stayId);

    if (stay.entryAnnulment) {
      throw new StayError('already-annulled', 'Esta estancia ya estaba anulada.');
    }

    if (stay.exitedAt === null || stay.exit === null) {
      throw new StayError('not-inside', 'Este movimiento no tiene una salida que anular.');
    }

    if (stay.flags?.missingEntry) {
      return this.replace({ ...stay, entryAnnulment: annulment });
    }

    if (this.openStayFor(stay.vehicle, stay.subject)) {
      throw new StayError(
        'already-inside',
        'No se puede anular: el vehículo tiene otro ingreso abierto. Anula primero ese ingreso.',
      );
    }

    const { exitNotRecorded: _closedWithoutExit, ...flags } = stay.flags ?? {};

    return this.replace({
      ...stay,
      exitedAt: null,
      exit: null,
      flags,
      annulledExits: [...(stay.annulledExits ?? []), { exitedAt: stay.exitedAt, audit: stay.exit, annulment }],
    });
  }

  /**
   * Devuelve una estancia al estado que tenía antes de un cambio. Lo usa
   * «Deshacer», que no deja rastro porque ocurre en los primeros segundos.
   *
   * @param stayId Estancia afectada.
   * @param before Copia previa; null si el cambio la creó (se elimina).
   */
  restore(stayId: string, before: ParkingStay | null): void {
    this._stays.update((stays) =>
      before
        ? stays.map((stay) => (stay.id === stayId ? before : stay))
        : stays.filter((stay) => stay.id !== stayId),
    );
  }

  private newStay(input: EntryInput, at: Date): ParkingStay {
    return {
      id: createId('stay'),
      vehicle: input.vehicle,
      zoneName: zoneFor(input.vehicle.type).name,
      enteredAt: at,
      exitedAt: null,
      subject: input.subject,
      entry: input.audit,
      exit: null,
    };
  }

  private require(stayId: string): ParkingStay {
    const stay = this.find(stayId);

    if (!stay) {
      throw new StayError('not-found', 'No encontramos ese ingreso.');
    }

    return stay;
  }

  private requireOpen(stayId: string): ParkingStay {
    const stay = this.require(stayId);

    if (stay.exitedAt !== null) {
      throw new StayError('already-exited', 'Este vehículo ya tenía la salida registrada.');
    }

    if (stay.entryAnnulment) {
      throw new StayError('already-annulled', 'Este ingreso fue anulado.');
    }

    return stay;
  }

  private add(stay: ParkingStay): ParkingStay {
    this._stays.update((stays) => [...stays, stay]);
    return stay;
  }

  private replace(updated: ParkingStay): ParkingStay {
    this._stays.update((stays) => stays.map((stay) => (stay.id === updated.id ? updated : stay)));
    return updated;
  }
}
