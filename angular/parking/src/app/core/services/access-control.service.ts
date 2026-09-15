import { Injectable, inject } from '@angular/core';
import {
  type AccessBlocker,
  type AccessCandidate,
  type AccessDecision,
  type AccessRecord,
  type AccessWarning,
  type CandidateSource,
  MIN_REASON_LENGTH,
  RECENT_MOVEMENT_MS,
  type RegisterOptions,
  UNDO_WINDOW_MS,
} from '../models/access';
import {
  type IdentificationMethod,
  MOVEMENT_LABELS,
  type MovementAudit,
  type ParkingMovement,
  type ParkingStay,
  type StaySubject,
  freeSpots,
  isInside,
  startOfDay,
} from '../models/parking';
import {
  type Applicant,
  type VehicleRegistration,
  declaredFullName,
  latestReview,
  nameTokens,
} from '../models/vehicle-registration';
import { visitorFullName } from '../models/visitor-pass';
import { dayAndTime } from '../utils/dates';
import { createId } from '../utils/id';
import { AFFILIATION_LABELS, AuthService, type AuthUser } from './auth.service';
import { ShiftService } from './shift.service';
import { StayError, StayService } from './stay.service';
import { VehicleRegistrationService, vehiclePhrase } from './vehicle-registration.service';
import { VisitorPassService } from './visitor-pass.service';

/**
 * Errores del control de acceso:
 * - not-allowed: la acción no corresponde (otro rol, movimiento de otro turno o caso especial que no aplica).
 * - no-shift: el guardia no tiene turno activo.
 * - blocked: algo impide registrar, como un registro sin aprobar o un pase que ya no sirve.
 * - unconfirmed-warnings: hay avisos que el guardia no confirmó.
 * - missing-note: la salida sin ingreso exige una nota.
 * - undo-expired: pasaron los 10 segundos de «Deshacer».
 * - missing-reason: la anulación exige un motivo.
 */
export type AccessErrorCode =
  | 'not-allowed'
  | 'no-shift'
  | 'blocked'
  | 'unconfirmed-warnings'
  | 'missing-note'
  | 'undo-expired'
  | 'missing-reason';

/** Error de negocio del control de acceso; el mensaje se muestra tal cual al guardia. */
export class AccessError extends Error {
  constructor(
    readonly code: AccessErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Máximo de resultados de una búsqueda. */
const MAX_RESULTS = 12;

/** Cierra los mensajes de «No autorizado»: la única vía para quien no tiene registro aprobado. */
const VISITOR_HINT = 'Si viene como visitante, debe llenar el formulario de visitantes y presentar su QR.';

/** Orden de preferencia cuando dos registros comparten placa: el más útil primero. */
const STATUS_PRIORITY: Record<VehicleRegistration['status'], number> = {
  approved: 0,
  pending: 1,
  'needs-update': 2,
  rejected: 3,
};

/** "kzt-45 f" → "KZT45F": solo letras y números, en mayúsculas. */
export function normalizePlateQuery(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Control de acceso en portería (Fases 2 y 3; sección 4 de planeacion-desarrollo.md).
 *
 * Aplica las reglas de la especificación sobre `StayService`:
 * - Identifica vehículos por placa, documento, nombre o pase QR.
 * - Decide la dirección sola (ADR-006) y valida: turno activo, registro
 *   aprobado, pase vigente.
 * - Avisa lo que requiere confirmación: zona llena, movimiento repetido, ingreso
 *   de otro día, otro vehículo de la misma persona dentro, identidad del visitante.
 * - Registra con la auditoría del guardia y del turno, permite deshacer durante
 *   10 segundos y anular después con un motivo (ADR-018).
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly auth = inject(AuthService);
  private readonly registrations = inject(VehicleRegistrationService);
  private readonly stays = inject(StayService);
  private readonly shifts = inject(ShiftService);
  private readonly passes = inject(VisitorPassService);

  // ---- Identificar ---------------------------------------------------------------------

  /**
   * Busca vehículos por placa, número de documento o nombre.
   *
   * Incluye registros de la comunidad en cualquier estado (así el guardia ve por
   * qué uno no está autorizado) y los visitantes que están dentro, para su salida.
   *
   * @param query Lo que escribió el guardia; se necesitan al menos 3 caracteres.
   * @returns Hasta 12 candidatos: primero las coincidencias exactas y lo que está dentro.
   */
  search(query: string): AccessCandidate[] {
    const text = query.trim();

    if (text.length < 3) {
      return [];
    }

    const alnum = normalizePlateQuery(text);
    const digits = text.replace(/\D/g, '');
    const documentQuery = /^[\d.\s-]+$/.test(text) && digits.length >= 5 ? digits : null;
    const tokens = /\d/.test(text) ? [] : nameTokens(text);

    // Con espacios y sin dígitos es un nombre ("ana mar"), no una placa; "kzt 45f" sí es placa.
    const plateLike = alnum.length >= 3 && (/\d/.test(text) || !/\s/.test(text));
    const plateMatch = (plate?: string) => plateLike && !!plate && plate.includes(alnum);
    const documentMatch = (document?: string) => !!documentQuery && !!document && document.includes(documentQuery);
    const nameMatch = (...names: string[]) =>
      tokens.length > 0 &&
      tokens.every((token) => names.some((name) => nameTokens(name).some((part) => part.startsWith(token))));

    const sourceOf = (plate: string | undefined, document: string | undefined, ...names: string[]): CandidateSource | null =>
      plateMatch(plate) ? 'plate' : documentMatch(document) ? 'document' : nameMatch(...names) ? 'name' : null;

    const candidates: AccessCandidate[] = [];

    for (const registration of this.relevantRegistrations()) {
      const source = sourceOf(
        registration.vehicle.plate,
        registration.owner.documentNumber,
        declaredFullName(registration.owner),
        registration.applicant.displayName,
      );

      if (source) {
        candidates.push(this.fromRegistration(registration, source));
      }
    }

    // Visitantes dentro y vehículos cuyo registro ya no existe: solo pueden salir.
    for (const stay of this.stays.inside()) {
      if (stay.subject.kind === 'institutional' && this.registrations.find(stay.subject.registrationId)) {
        continue;
      }

      const source = sourceOf(stay.vehicle.plate, stay.subject.documentNumber, stay.subject.fullName);

      if (source) {
        candidates.push(this.fromStay(stay, source));
      }
    }

    const exact = (candidate: AccessCandidate) =>
      candidate.vehicle.plate === alnum || (!!documentQuery && candidate.subject.documentNumber === documentQuery);

    return candidates
      .sort(
        (a, b) =>
          Number(exact(b)) - Number(exact(a)) ||
          Number(!!b.openStay) - Number(!!a.openStay) ||
          a.subject.fullName.localeCompare(b.subject.fullName, 'es'),
      )
      .slice(0, MAX_RESULTS);
  }

  /**
   * Candidato para una estancia abierta, p. ej. desde «Vehículos dentro».
   *
   * @returns El candidato, o null si la estancia no existe o ya no está dentro.
   */
  candidateForStay(stayId: string): AccessCandidate | null {
    const stay = this.stays.find(stayId);

    if (!stay || !isInside(stay)) {
      return null;
    }

    const registration =
      stay.subject.kind === 'institutional' ? this.registrations.find(stay.subject.registrationId) : undefined;

    return registration ? this.fromRegistration(registration, 'inside-list') : this.fromStay(stay, 'inside-list');
  }

  /**
   * Candidato para el token leído de un QR de visitante (Fase 3).
   *
   * @returns El candidato, o null si el código no corresponde a ningún pase.
   */
  candidateForPass(token: string): AccessCandidate | null {
    const pass = this.passes.find(token);

    if (!pass) {
      return null;
    }

    const subject: StaySubject = {
      kind: 'visitor',
      passToken: pass.token,
      fullName: visitorFullName(pass.visitor),
      documentNumber: pass.visitor.documentNumber,
      reason: pass.visitor.reason,
    };

    return {
      key: `pass:${pass.token}`,
      vehicle: pass.visitor.vehicle,
      subject,
      registration: null,
      pass,
      openStay: this.stays.openStayFor(pass.visitor.vehicle, subject) ?? null,
      context: `Visitante · ${pass.visitor.reason}`,
      source: 'qr',
    };
  }

  // ---- Validar -----------------------------------------------------------------------------

  /**
   * Evalúa a un candidato con los datos de este momento: relee su registro, su
   * pase y su estancia, porque la tarjeta pudo quedar abierta mientras cambiaban.
   *
   * @param candidate Vehículo identificado.
   * @param now Momento de referencia, inyectable para las pruebas.
   * @returns Dirección, lo que impide registrar y lo que requiere confirmación.
   */
  evaluate(candidate: AccessCandidate, now: Date = new Date()): AccessDecision {
    const current = this.refresh(candidate);
    const { openStay } = current;
    const direction = openStay ? 'exit' : 'entry';

    const blockers: AccessBlocker[] = [];
    const warnings: AccessWarning[] = [];

    if (!this.shifts.mine()) {
      blockers.push({ code: 'no-shift', message: 'No tienes un turno activo: tómalo para registrar movimientos a tu nombre.' });
    }

    if (direction === 'entry') {
      blockers.push(...this.entryBlockers(current, now));
      warnings.push(...this.entryWarnings(current));
    } else if (openStay && openStay.enteredAt.getTime() < startOfDay(now).getTime()) {
      warnings.push({
        code: 'stale-entry',
        // La hora termina en «a. m.» o «p. m.»: la frase sigue después para no duplicar el punto.
        message: `Su ingreso de ${dayAndTime(openStay.enteredAt, now)} sigue abierto. Si está saliendo, registra la salida; si está entrando, cierra ese ingreso y registra uno nuevo.`,
      });
    }

    const last = this.lastMovementOf(current);

    if (last && now.getTime() - last.at.getTime() < RECENT_MOVEMENT_MS) {
      warnings.push({
        code: 'recent-movement',
        message: `Este vehículo tuvo un ${MOVEMENT_LABELS[last.kind].toLowerCase()} hace menos de 2 minutos. Confirma que no es un registro repetido.`,
      });
    }

    return {
      candidate: current,
      direction,
      blockers,
      warnings,
      canCloseStaleEntry: warnings.some((warning) => warning.code === 'stale-entry'),
      canExitWithoutEntry: direction === 'entry' && !current.pass,
    };
  }

  // ---- Registrar ---------------------------------------------------------------------------

  /**
   * Registra lo que confirmó el guardia. Vuelve a evaluar al momento de
   * registrar, por si algo cambió mientras decidía.
   *
   * @param decision Decisión que vio el guardia.
   * @param options Acción elegida, confirmación de avisos y nota.
   * @param now Momento del registro; por defecto, ahora.
   * @returns Lo registrado, con lo necesario para deshacerlo durante 10 segundos.
   * @throws AccessError `not-allowed`, `no-shift`, `blocked`, `unconfirmed-warnings` o `missing-note`.
   */
  register(decision: AccessDecision, options: RegisterOptions, now: Date = new Date()): AccessRecord {
    const guard = this.requireGuard();
    const shift = this.shifts.mine();

    if (!shift) {
      throw new AccessError('no-shift', 'Toma el turno para registrar movimientos a tu nombre.');
    }

    const fresh = this.evaluate(decision.candidate, now);
    const { candidate } = fresh;
    const note = options.note.trim();
    const method = this.methodFor(candidate);
    const audit: MovementAudit = {
      guardUid: guard.uid,
      guardName: guard.displayName,
      shiftId: shift.id,
      method,
      ...(note ? { note } : {}),
    };
    const input = { vehicle: candidate.vehicle, subject: candidate.subject, audit };
    const base = { id: createId('acc'), at: now, undoUntil: new Date(now.getTime() + UNDO_WINDOW_MS), method };

    if (options.action === 'exit-without-entry') {
      if (!fresh.canExitWithoutEntry) {
        throw new AccessError('not-allowed', 'Este vehículo tiene un ingreso abierto: registra la salida normal.');
      }

      if (!note) {
        throw new AccessError('missing-note', 'Explica en la nota por qué sale sin un ingreso registrado.');
      }

      const stay = this.stays.registerExitWithoutEntry(input, now);
      return { ...base, kind: 'exit-without-entry', stay, changes: [{ stayId: stay.id, before: null }], passToken: null };
    }

    if (options.action === 'close-stale-and-enter') {
      const stale = candidate.openStay;

      if (!fresh.canCloseStaleEntry || !stale) {
        throw new AccessError('not-allowed', 'Este vehículo no tiene un ingreso de otro día que cerrar.');
      }

      const blocker = this.entryBlockers(candidate, now)[0];

      if (blocker) {
        throw new AccessError('blocked', blocker.message);
      }

      this.requireConfirmation(fresh, options);
      this.stays.closeWithoutExit(stale.id, audit, now);
      const stay = this.stays.registerEntry(input, now);

      return {
        ...base,
        kind: 'reentry',
        stay,
        changes: [
          { stayId: stale.id, before: stale },
          { stayId: stay.id, before: null },
        ],
        passToken: null,
      };
    }

    const blocker = fresh.blockers[0];

    if (blocker) {
      throw new AccessError('blocked', blocker.message);
    }

    this.requireConfirmation(fresh, options);

    if (fresh.direction === 'exit' && candidate.openStay) {
      const before = candidate.openStay;
      const stay = this.stays.registerExit(before.id, audit, now);
      return { ...base, kind: 'exit', stay, changes: [{ stayId: before.id, before }], passToken: null };
    }

    const stay = this.stays.registerEntry(input, now);

    if (candidate.pass) {
      try {
        this.passes.markUsed(candidate.pass.token, { stayId: stay.id, guardName: guard.displayName }, now);
      } catch (error) {
        // Sin pase usado no hay ingreso de visitante: se retira la estancia recién creada.
        this.stays.restore(stay.id, null);
        throw error;
      }
    }

    return {
      ...base,
      kind: 'entry',
      stay,
      changes: [{ stayId: stay.id, before: null }],
      passToken: candidate.pass?.token ?? null,
    };
  }

  /**
   * Deshace un registro en los primeros 10 segundos, sin dejar rastro (ADR-018).
   *
   * @throws AccessError `undo-expired` si ya pasó la ventana.
   */
  undo(record: AccessRecord, now: Date = new Date()): void {
    if (now.getTime() > record.undoUntil.getTime()) {
      throw new AccessError(
        'undo-expired',
        'Pasaron más de 10 segundos. Para corregirlo, anula el movimiento en «Movimientos» con un motivo.',
      );
    }

    for (const change of [...record.changes].reverse()) {
      this.stays.restore(change.stayId, change.before);
    }

    if (record.passToken) {
      this.passes.markUnused(record.passToken);
    }
  }

  // ---- Anular ------------------------------------------------------------------------------

  /** true si quien tiene la sesión puede anular el movimiento: vigente y de su turno activo. */
  canAnnul(movement: ParkingMovement): boolean {
    const shift = this.shifts.mine();
    return !movement.annulment && !!shift && movement.audit.shiftId === shift.id;
  }

  /**
   * Anula un movimiento del turno activo, con motivo (ADR-018). Anular un ingreso
   * anula la estancia completa; anular una salida deja el vehículo dentro otra vez.
   * Anular el ingreso de un visitante no reactiva su pase.
   *
   * @throws AccessError `not-allowed`, `no-shift` o `missing-reason`.
   */
  annul(movement: ParkingMovement, reason: string, now: Date = new Date()): void {
    const guard = this.requireGuard();
    const shift = this.shifts.mine();

    if (!shift) {
      throw new AccessError('no-shift', 'Toma el turno para anular movimientos.');
    }

    if (movement.annulment) {
      throw new AccessError('not-allowed', 'Este movimiento ya está anulado.');
    }

    if (movement.audit.shiftId !== shift.id) {
      throw new AccessError('not-allowed', 'Solo puedes anular movimientos registrados en tu turno.');
    }

    const text = reason.trim();

    if (text.length < MIN_REASON_LENGTH) {
      throw new AccessError('missing-reason', `Escribe el motivo de la anulación (al menos ${MIN_REASON_LENGTH} caracteres).`);
    }

    const annulment = { at: now, guardUid: guard.uid, guardName: guard.displayName, reason: text };

    try {
      if (movement.kind === 'entry') {
        this.stays.annulEntry(movement.stay.id, annulment);
      } else {
        this.stays.annulExit(movement.stay.id, annulment);
      }
    } catch (error) {
      if (error instanceof StayError) {
        throw new AccessError('not-allowed', error.message);
      }

      throw error;
    }
  }

  // ---- Internos ------------------------------------------------------------------------------

  /** Registros a considerar: si varios comparten placa, solo el más útil (aprobado, luego el más reciente). */
  private relevantRegistrations(): VehicleRegistration[] {
    const byPlate = new Map<string, VehicleRegistration>();
    const withoutPlate: VehicleRegistration[] = [];

    for (const registration of this.registrations.all()) {
      const plate = registration.vehicle.plate;

      if (!plate) {
        withoutPlate.push(registration);
        continue;
      }

      const current = byPlate.get(plate);
      const better =
        !current ||
        STATUS_PRIORITY[registration.status] < STATUS_PRIORITY[current.status] ||
        (STATUS_PRIORITY[registration.status] === STATUS_PRIORITY[current.status] &&
          registration.updatedAt.getTime() > current.updatedAt.getTime());

      if (better) {
        byPlate.set(plate, registration);
      }
    }

    return [...byPlate.values(), ...withoutPlate];
  }

  private fromRegistration(registration: VehicleRegistration, source: CandidateSource): AccessCandidate {
    const subject: StaySubject = {
      kind: 'institutional',
      uid: registration.applicant.uid,
      registrationId: registration.id,
      fullName: declaredFullName(registration.owner),
      documentNumber: registration.owner.documentNumber,
    };

    return {
      key: `reg:${registration.id}`,
      vehicle: registration.vehicle,
      subject,
      registration,
      pass: null,
      openStay: this.stays.openStayFor(registration.vehicle, subject) ?? null,
      context: this.affiliationOf(registration.applicant),
      source,
    };
  }

  private fromStay(stay: ParkingStay, source: CandidateSource): AccessCandidate {
    return {
      key: `stay:${stay.id}`,
      vehicle: stay.vehicle,
      subject: stay.subject,
      registration: null,
      // El pase ya se usó para entrar: la salida no lo exige.
      pass: null,
      openStay: isInside(stay) ? stay : null,
      context:
        stay.subject.kind === 'visitor'
          ? `Visitante · ${stay.subject.reason}`
          : 'Comunidad universitaria · vehículo sin registro vigente',
      source,
    };
  }

  private affiliationOf(applicant: Applicant): string {
    const label = applicant.affiliation ? AFFILIATION_LABELS[applicant.affiliation] : 'Comunidad universitaria';
    return applicant.program ? `${label} · ${applicant.program}` : label;
  }

  /**
   * Relee el registro, el pase y la estancia abierta del candidato. Si el registro
   * ya no existe, el candidato se queda sin él y su ingreso queda bloqueado.
   */
  private refresh(candidate: AccessCandidate): AccessCandidate {
    const registration = candidate.registration ? (this.registrations.find(candidate.registration.id) ?? null) : null;

    return {
      ...candidate,
      vehicle: registration?.vehicle ?? candidate.vehicle,
      registration,
      pass: candidate.pass ? (this.passes.find(candidate.pass.token) ?? candidate.pass) : null,
      openStay: this.stays.openStayFor(candidate.vehicle, candidate.subject) ?? null,
    };
  }

  private entryBlockers(candidate: AccessCandidate, now: Date): AccessBlocker[] {
    const blockers: AccessBlocker[] = [];
    const { registration, subject, pass } = candidate;

    if (subject.kind === 'institutional' && registration?.status !== 'approved') {
      blockers.push({
        code: 'not-approved',
        message: registration
          ? this.notApprovedMessage(registration)
          : `No autorizado: este vehículo ya no tiene un registro vigente. ${VISITOR_HINT}`,
      });
    }

    // Los visitantes siempre entran con su QR (4.4): el que sale no puede volver a entrar sin uno nuevo.
    if (subject.kind === 'visitor' && !pass) {
      blockers.push({
        code: 'pass-required',
        message: 'Los visitantes solo ingresan con su pase QR vigente: escanéalo en «Pase de visitante (QR)».',
      });
    }

    if (pass) {
      const status = this.passes.statusOf(pass, now);

      if (status === 'expired') {
        blockers.push({
          code: 'pass-expired',
          message: 'El pase está vencido: el visitante debe generar uno nuevo desde el formulario de visitantes.',
        });
      } else if (status === 'used') {
        blockers.push({ code: 'pass-used', message: 'Este pase ya se usó para ingresar y no sirve otra vez.' });
      } else if (status === 'revoked') {
        blockers.push({
          code: 'pass-revoked',
          message: 'Este pase fue anulado porque el visitante generó otro. Pide el código más reciente.',
        });
      }
    }

    return blockers;
  }

  private entryWarnings(candidate: AccessCandidate): AccessWarning[] {
    const warnings: AccessWarning[] = [];
    const zone = this.stays.zones().find((item) => item.accepts === candidate.vehicle.type);

    if (zone && freeSpots(zone) === 0) {
      warnings.push({
        code: 'zone-full',
        message: `${zone.name} no tiene puestos libres. Registra el ingreso solo si ves un puesto disponible.`,
      });
    }

    const subject = candidate.subject;

    if (subject.kind === 'institutional') {
      const other = this.stays
        .inside()
        .find((stay) => stay.subject.kind === 'institutional' && stay.subject.uid === subject.uid);

      if (other) {
        warnings.push({
          code: 'other-vehicle-inside',
          message: `${subject.fullName} ya tiene dentro ${vehiclePhrase(other.vehicle)}.`,
        });
      }
    }

    if (candidate.pass) {
      warnings.push({
        code: 'check-identity',
        message: 'Compara el nombre y el número de documento con el documento de identidad del visitante.',
      });
    }

    return warnings;
  }

  private notApprovedMessage(registration: VehicleRegistration): string {
    switch (registration.status) {
      case 'pending':
        return `No autorizado: el registro de este vehículo está pendiente de aprobación. ${VISITOR_HINT}`;
      case 'needs-update':
        return `No autorizado: la administración pidió actualizar un documento y el registro aún no está aprobado. ${VISITOR_HINT}`;
      default: {
        const reason = latestReview(registration)?.reason;
        return `No autorizado: el registro fue rechazado${reason ? ` (${reason.toLowerCase()})` : ''}. ${VISITOR_HINT}`;
      }
    }
  }

  /** Último movimiento vigente del mismo vehículo, para detectar registros repetidos. */
  private lastMovementOf(candidate: AccessCandidate): ParkingMovement | undefined {
    return this.stays.movements().find((movement) => !movement.annulment && this.sameVehicle(movement.stay, candidate));
  }

  private sameVehicle(stay: ParkingStay, candidate: AccessCandidate): boolean {
    const plate = candidate.vehicle.plate;

    if (plate && stay.vehicle.plate === plate) {
      return true;
    }

    const { subject } = candidate;

    if (subject.kind === 'institutional' && stay.subject.kind === 'institutional') {
      return subject.registrationId !== null && stay.subject.registrationId === subject.registrationId;
    }

    return subject.kind === 'visitor' && stay.subject.kind === 'visitor' && stay.subject.passToken === subject.passToken;
  }

  private requireConfirmation(decision: AccessDecision, options: RegisterOptions): void {
    if (decision.warnings.length && !options.warningsConfirmed) {
      throw new AccessError('unconfirmed-warnings', 'Confirma que revisaste los avisos antes de registrar.');
    }
  }

  /** Documento si se buscó por documento; QR si se escaneó; en lo demás, registro manual. */
  private methodFor(candidate: AccessCandidate): IdentificationMethod {
    return candidate.source === 'document' ? 'document' : candidate.source === 'qr' ? 'qr' : 'manual';
  }

  private requireGuard(): AuthUser {
    const user = this.auth.user();

    if (user?.role !== 'security') {
      throw new AccessError('not-allowed', 'Solo el personal de seguridad registra movimientos.');
    }

    return user;
  }
}
