/**
 * Modelo del control de acceso en portería (sección 4 de planeacion-desarrollo.md).
 *
 * El flujo es siempre el mismo (ADR-006): identificar el vehículo, validar si
 * puede pasar y registrar. La dirección no la elige el guardia: si el vehículo
 * tiene un ingreso abierto es una salida; si no, un ingreso.
 */
import type { IdentificationMethod, ParkingStay, StaySubject } from './parking';
import type { Vehicle } from './vehicle';
import type { VehicleRegistration } from './vehicle-registration';
import type { VisitorPass } from './visitor-pass';

export type AccessDirection = 'entry' | 'exit';

/** Cómo llegó el guardia a este vehículo; decide el método que queda registrado. */
export type CandidateSource = 'plate' | 'document' | 'name' | 'qr' | 'inside-list';

/** Un vehículo identificado en portería, con su persona y su situación actual. */
export interface AccessCandidate {
  /** Clave estable: `reg:<id>`, `stay:<id>` o `pass:<token>`. */
  key: string;
  vehicle: Vehicle;
  subject: StaySubject;
  /** Registro del vehículo, si es de la comunidad. */
  registration: VehicleRegistration | null;
  /** Pase con el que se identificó, si es un visitante que llega. */
  pass: VisitorPass | null;
  /** Estancia abierta, si el vehículo está dentro. */
  openStay: ParkingStay | null;
  /** Vínculo o motivo de la visita, p. ej. "Estudiante · Contaduría Pública". */
  context: string;
  source: CandidateSource;
}

/**
 * Motivos que impiden registrar:
 * - no-shift: el guardia no tiene turno activo (ADR-009).
 * - not-approved: el vehículo de la comunidad no tiene un registro aprobado.
 * - pass-required: un visitante intenta ingresar sin escanear su pase (4.4).
 * - pass-expired, pass-used, pass-revoked: el pase escaneado ya no sirve.
 */
export type AccessBlockerCode =
  | 'no-shift'
  | 'not-approved'
  | 'pass-required'
  | 'pass-expired'
  | 'pass-used'
  | 'pass-revoked';

export interface AccessBlocker {
  code: AccessBlockerCode;
  message: string;
}

/** Situaciones que permiten registrar, pero solo si el guardia lo confirma. */
export type AccessWarningCode =
  | 'zone-full'
  | 'recent-movement'
  | 'stale-entry'
  | 'other-vehicle-inside'
  | 'check-identity';

export interface AccessWarning {
  code: AccessWarningCode;
  message: string;
}

/** Resultado de evaluar a un candidato: qué toca hacer y qué lo impide o lo condiciona. */
export interface AccessDecision {
  candidate: AccessCandidate;
  direction: AccessDirection;
  blockers: AccessBlocker[];
  warnings: AccessWarning[];
  /** El vehículo tiene un ingreso de otro día: se puede cerrar y registrar uno nuevo. */
  canCloseStaleEntry: boolean;
  /** El vehículo figura afuera: se puede registrar una salida sin ingreso, con nota. */
  canExitWithoutEntry: boolean;
}

/**
 * Acción que confirma el guardia:
 * - default: la dirección que decidió el sistema.
 * - close-stale-and-enter: cerrar el ingreso viejo sin salida y registrar uno nuevo.
 * - exit-without-entry: registrar una salida aunque no haya ingreso (exige nota).
 */
export type AccessAction = 'default' | 'close-stale-and-enter' | 'exit-without-entry';

export interface RegisterOptions {
  action: AccessAction;
  /** El guardia revisó los avisos y decidió continuar. */
  warningsConfirmed: boolean;
  note: string;
}

export type AccessRecordKind = 'entry' | 'exit' | 'reentry' | 'exit-without-entry';

export const ACCESS_RECORD_LABELS: Record<AccessRecordKind, string> = {
  entry: 'Ingreso registrado',
  exit: 'Salida registrada',
  reentry: 'Ingreso registrado y el anterior cerrado',
  'exit-without-entry': 'Salida registrada sin ingreso',
};

/** Lo que se registró, con lo necesario para deshacerlo dentro de la ventana. */
export interface AccessRecord {
  id: string;
  kind: AccessRecordKind;
  /** Estancia principal: la creada o la cerrada. */
  stay: ParkingStay;
  at: Date;
  /** Hasta cuándo se puede deshacer sin motivo. */
  undoUntil: Date;
  method: IdentificationMethod;
  /** Estado previo de cada estancia tocada (null si se creó), en el orden en que se cambió. */
  changes: { stayId: string; before: ParkingStay | null }[];
  /** Pase de visitante que quedó usado, para devolverlo si se deshace. */
  passToken: string | null;
}

/** Ventana para deshacer un movimiento sin dar motivo (4.6). */
export const UNDO_WINDOW_MS = 10_000;

/** Un movimiento del mismo vehículo más reciente que esto pide confirmación (4.6). */
export const RECENT_MOVEMENT_MS = 2 * 60_000;

/** Mínimo de caracteres del motivo para anular un movimiento. */
export const MIN_REASON_LENGTH = 5;
