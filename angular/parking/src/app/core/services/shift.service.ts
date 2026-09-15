import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PARKING } from '../config/parking.config';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { seedShifts } from '../demo/seed-shifts';
import { type SecurityShift, type ShiftHandover, shiftStatus, totalInside } from '../models/shift';
import { atClock } from '../utils/dates';
import { createId } from '../utils/id';
import { AuthService, type AuthUser } from './auth.service';
import { IncidentService } from './incident.service';
import { NotificationService } from './notification.service';
import { StayService } from './stay.service';

const STORAGE_KEY = 'shifts';

export type ShiftErrorCode =
  | 'forbidden'
  | 'shift-in-progress'
  | 'handover-pending'
  | 'no-active-shift'
  | 'nothing-to-receive'
  | 'own-handover'
  | 'missing-notes';

/** Error de negocio al tomar, entregar o recibir un turno. */
export class ShiftError extends Error {
  constructor(
    readonly code: ShiftErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Lo que dejaría un turno si se entregara ahora: sin hora, notas ni tipo de cierre. */
export type ShiftSummary = Omit<ShiftHandover, 'at' | 'notes' | 'closesDay'>;

/** Datos del guardia que recibe un turno. */
export interface ReceptionInput {
  /** El conteo físico del parqueadero coincidió con el del sistema. */
  countMatches: boolean;
  /** Obligatorio cuando el conteo no coincide. */
  notes: string;
}

/**
 * Turnos del personal de seguridad en la portería (ADR-009).
 *
 * Reglas:
 * - Solo el personal de seguridad toma, entrega o recibe turnos.
 * - Hay un solo turno activo por portería.
 * - Si el turno anterior se entregó a un relevo, hay que recibirlo antes de
 *   empezar; quien lo entregó no puede recibirlo.
 * - Si al recibir el conteo físico no coincide, se exige una nota y se crea una
 *   incidencia para la administración.
 *
 * TODO: en demostración vive en el navegador. Con Firebase, cada operación será
 * una transacción en el servidor para que dos guardias no tomen el turno a la vez.
 */
@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly auth = inject(AuthService);
  private readonly stays = inject(StayService);
  private readonly incidents = inject(IncidentService);
  private readonly notifications = inject(NotificationService);

  private readonly _shifts = signal<SecurityShift[]>(loadDemo<SecurityShift[]>(STORAGE_KEY) ?? seedShifts());

  /** Todos los turnos, el más reciente primero. */
  readonly history = computed(() =>
    [...this._shifts()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
  );

  /** Turno en curso en la portería, sea de quien sea; null si nadie lo tiene. */
  readonly active = computed(() => this.history().find((shift) => shift.handover === null) ?? null);

  /** Turno entregado que espera a su relevo; null si no hay ninguno. */
  readonly awaitingReception = computed(
    () => this.history().find((shift) => shiftStatus(shift) === 'awaiting-reception') ?? null,
  );

  /** Turno activo de quien tiene la sesión abierta; null si no lo tiene. */
  readonly mine = computed(() => {
    const active = this.active();
    return active && active.guardUid === this.auth.user()?.uid ? active : null;
  });

  /** Turno entregado que le toca recibir a quien tiene la sesión abierta. */
  readonly toReceive = computed(() => {
    const pending = this.awaitingReception();
    const user = this.auth.user();

    return pending && user?.role === 'security' && pending.guardUid !== user.uid ? pending : null;
  });

  /** Último turno si cerró la jornada; sirve para avisar al abrir la siguiente. */
  readonly lastClosedDay = computed(() => {
    const latest = this.history()[0];
    return latest && shiftStatus(latest) === 'closed' ? latest : null;
  });

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._shifts()));
  }

  /**
   * Calcula en vivo lo que dejaría el turno si se entregara ahora.
   *
   * @param shift Turno a resumir; los movimientos se cuentan por el id del turno
   * y los anulados no suman.
   */
  summaryFor(shift: SecurityShift): ShiftSummary {
    const movements = this.stays
      .movements()
      .filter((movement) => movement.audit.shiftId === shift.id && !movement.annulment);

    return {
      insideByType: { ...this.stays.insideByType() },
      entries: movements.filter((movement) => movement.kind === 'entry').length,
      exits: movements.filter((movement) => movement.kind === 'exit').length,
      openIncidents: this.incidents.unresolved().length,
    };
  }

  /**
   * Empieza un turno sin relevo, p. ej. el primero del día.
   *
   * @returns El turno creado.
   * @throws ShiftError `forbidden` si la sesión no es de seguridad,
   * `shift-in-progress` si alguien ya tiene el turno o
   * `handover-pending` si hay un turno entregado por recibir.
   */
  start(): SecurityShift {
    const guard = this.requireGuard();
    const active = this.active();

    if (active) {
      // La hora ya termina en "a. m." / "p. m.": el mensaje no le agrega otro punto.
      throw new ShiftError(
        'shift-in-progress',
        `No puedes tomar el turno: lo tiene ${active.guardName} desde ${atClock(active.startedAt)}`,
      );
    }

    const pending = this.awaitingReception();

    if (pending) {
      throw new ShiftError('handover-pending', `Primero hay que recibir el turno que entregó ${pending.guardName}.`);
    }

    return this.open(guard, null);
  }

  /**
   * Entrega el turno activo de quien tiene la sesión.
   *
   * @param notes Observaciones para quien recibe.
   * @param closesDay true si no hay relevo y el turno cierra la jornada.
   * @returns El turno entregado.
   * @throws ShiftError `forbidden` si la sesión no es de seguridad o
   * `no-active-shift` si no tiene un turno en curso.
   */
  handOver(notes: string, closesDay: boolean): SecurityShift {
    const guard = this.requireGuard();
    const shift = this.mine();

    if (!shift) {
      throw new ShiftError('no-active-shift', 'No tienes un turno en curso para entregar.');
    }

    const handover: ShiftHandover = { ...this.summaryFor(shift), at: new Date(), notes: notes.trim(), closesDay };
    const updated: SecurityShift = { ...shift, handover };
    this.replace(updated);

    const inside = totalInside(handover.insideByType);

    if (closesDay) {
      if (inside > 0) {
        this.notifications.notify({
          kind: 'shift',
          audience: 'admins',
          title: 'Jornada cerrada con vehículos dentro',
          message: `${guard.displayName} cerró la jornada con ${inside} ${inside === 1 ? 'vehículo' : 'vehículos'} dentro.`,
        });
      }
    } else {
      this.notifications.notify({
        kind: 'shift',
        audience: 'security',
        title: 'Turno por recibir',
        message: `${guard.displayName} entregó el turno a ${atClock(handover.at)} y falta que alguien lo reciba.`,
        link: '/seguridad/turno',
      });
    }

    return updated;
  }

  /**
   * Recibe el turno entregado y empieza el propio.
   *
   * @param input Si el conteo coincidió y las observaciones.
   * @returns El turno nuevo de quien recibe.
   * @throws ShiftError `forbidden`, `nothing-to-receive` si no hay turno entregado,
   * `own-handover` si quien recibe es quien lo entregó, o `missing-notes` si el
   * conteo no coincide y no se explicó la diferencia.
   */
  receive(input: ReceptionInput): SecurityShift {
    const guard = this.requireGuard();
    const pending = this.awaitingReception();

    if (!pending) {
      throw new ShiftError('nothing-to-receive', 'No hay ningún turno entregado por recibir.');
    }

    if (pending.guardUid === guard.uid) {
      throw new ShiftError('own-handover', 'El turno lo debe recibir otro guardia.');
    }

    const notes = input.notes.trim();

    if (!input.countMatches && !notes) {
      throw new ShiftError('missing-notes', 'Explica qué diferencia encontraste en el conteo.');
    }

    const incidentId = input.countMatches ? null : this.reportCountMismatch(guard, pending, notes);

    this.replace({
      ...pending,
      reception: {
        at: new Date(),
        guardUid: guard.uid,
        guardName: guard.displayName,
        countMatches: input.countMatches,
        notes,
        incidentId,
      },
    });

    return this.open(guard, pending.id);
  }

  private reportCountMismatch(guard: AuthUser, pending: SecurityShift, notes: string): string {
    const incident = this.incidents.report({
      title: 'Diferencia en el conteo al recibir el turno',
      description: `${guard.displayName} recibió el turno de ${pending.guardName}: ${notes}`,
      zoneName: PARKING.postName,
      severity: 'medium',
      reportedBy: guard.displayName,
    });

    this.notifications.notify({
      kind: 'shift',
      audience: 'admins',
      title: 'Diferencia al recibir un turno',
      message: `${guard.displayName} reportó que el conteo no coincide con lo que dejó ${pending.guardName}.`,
      link: '/admin/incidencias',
    });

    return incident.id;
  }

  private open(guard: AuthUser, receivedFromShiftId: string | null): SecurityShift {
    const shift: SecurityShift = {
      id: createId('shift'),
      post: PARKING.postName,
      guardUid: guard.uid,
      guardName: guard.displayName,
      startedAt: new Date(),
      receivedFromShiftId,
      handover: null,
      reception: null,
    };

    this._shifts.update((shifts) => [...shifts, shift]);
    return shift;
  }

  private requireGuard(): AuthUser {
    const user = this.auth.user();

    if (user?.role !== 'security') {
      throw new ShiftError('forbidden', 'Solo el personal de seguridad maneja los turnos.');
    }

    return user;
  }

  private replace(updated: SecurityShift): void {
    this._shifts.update((shifts) => shifts.map((shift) => (shift.id === updated.id ? updated : shift)));
  }
}
