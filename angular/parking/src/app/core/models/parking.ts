/**
 * Modelo del parqueadero: cupos, estancias y movimientos.
 *
 * Los puestos están numerados pero no se asignan y no hay sensores: la
 * ocupación se calcula contando los vehículos con ingreso abierto
 * (ADR-008 en planeacion-desarrollo.md).
 */
import type { Vehicle, VehicleType } from './vehicle';

// ---- Cupos y ocupación ----------------------------------------------------------------

/** Cupo de un tipo de vehículo, tal como lo configura cada institución. */
export interface ZoneCapacity {
  /** Identificador estable de la zona, p. ej. `motos`. */
  id: string;
  /** Nombre visible, p. ej. "Zona de motos". */
  name: string;
  /** Tipo de vehículo que ocupa estos puestos. */
  accepts: VehicleType;
  /** Total de puestos para ese tipo. */
  capacity: number;
}

/** Una zona con su ocupación en este momento. */
export interface ParkingZone extends ZoneCapacity {
  /** Vehículos de este tipo que están dentro. */
  occupied: number;
}

/**
 * El estado de una zona nunca se comunica solo con color: cada chip lleva su
 * etiqueta y su icono, porque rojo y ámbar son casi indistinguibles para quien
 * tiene daltonismo.
 */
export type ZoneStatus = 'available' | 'filling' | 'full';

export const ZONE_STATUS_LABELS: Record<ZoneStatus, string> = {
  available: 'Disponible',
  filling: 'Casi lleno',
  full: 'Sin cupos',
};

/** A partir de este nivel de ocupación la zona se marca como casi llena. */
const FILLING_THRESHOLD = 0.85;

/** Puestos libres de una zona; nunca negativo aunque se registren ingresos de más. */
export function freeSpots(zone: ParkingZone): number {
  return Math.max(0, zone.capacity - zone.occupied);
}

/** Fracción ocupada entre 0 y 1. Una zona sin cupo configurado cuenta como vacía. */
export function occupancyRatio(zone: ParkingZone): number {
  return zone.capacity > 0 ? Math.min(1, zone.occupied / zone.capacity) : 0;
}

/** Clasifica la zona en disponible, casi llena (≥ 85 %) o sin cupos. */
export function zoneStatus(zone: ParkingZone): ZoneStatus {
  if (freeSpots(zone) === 0) {
    return 'full';
  }

  return occupancyRatio(zone) >= FILLING_THRESHOLD ? 'filling' : 'available';
}

// ---- Estancias y movimientos ------------------------------------------------------------

/** Cómo se identificó el vehículo en portería (ADR-007). */
export type IdentificationMethod = 'plate-photo' | 'document' | 'qr' | 'manual';

export const IDENTIFICATION_LABELS: Record<IdentificationMethod, string> = {
  'plate-photo': 'Foto de placa',
  document: 'Documento',
  qr: 'Código QR',
  manual: 'Registro manual',
};

/** Persona a la que pertenece una estancia: alguien de la comunidad o un visitante. */
export type StaySubject =
  | {
      kind: 'institutional';
      /** uid de la cuenta institucional. */
      uid: string;
      /** Solicitud de registro aprobada; null si el vehículo ya se eliminó. */
      registrationId: string | null;
      /** Nombres y apellidos tal como figuran en el registro del vehículo. */
      fullName: string;
      documentNumber?: string;
    }
  | {
      kind: 'visitor';
      /** Token del pase QR con el que ingresó. */
      passToken: string;
      fullName: string;
      documentNumber: string;
      /** Motivo de la visita escrito en el formulario. */
      reason: string;
    };

/** Quién registró un ingreso o una salida, y cómo identificó el vehículo. */
export interface MovementAudit {
  guardUid: string;
  guardName: string;
  /** Turno activo al registrar; null en datos históricos anteriores a los turnos. */
  shiftId: string | null;
  method: IdentificationMethod;
  /** Observación del guardia; obligatoria en los casos especiales (4.6). */
  note?: string;
}

/**
 * Anulación de un movimiento, hecha cuando ya pasó la ventana de «Deshacer».
 * El movimiento no se borra: queda en la bitácora marcado como anulado (ADR-018).
 */
export interface MovementAnnulment {
  at: Date;
  guardUid: string;
  guardName: string;
  reason: string;
}

/** Salida registrada por error y anulada; la estancia volvió a quedar abierta. */
export interface AnnulledExit {
  exitedAt: Date;
  audit: MovementAudit;
  annulment: MovementAnnulment;
}

/** Marcas de control de una estancia (4.8), para que la administración las revise. */
export interface StayFlags {
  /** La salida se registró sin un ingreso previo en el sistema. */
  missingEntry?: boolean;
  /**
   * El ingreso se cerró sin salida registrada: el vehículo volvió a entrar, así
   * que en algún momento salió sin pasar por portería. La hora de salida es la
   * del cierre, no la real.
   */
  exitNotRecorded?: boolean;
}

/**
 * Una estancia completa en el parqueadero, de la entrada a la salida.
 *
 * Guarda una copia del vehículo tal como era ese día: si el usuario elimina el
 * vehículo después, su historial sigue mostrando la placa con la que entró.
 */
export interface ParkingStay {
  id: string;
  vehicle: Vehicle;
  zoneName: string;
  enteredAt: Date;
  /** null mientras el vehículo siga dentro. */
  exitedAt: Date | null;
  subject: StaySubject;
  /** Registro del ingreso. */
  entry: MovementAudit;
  /** Registro de la salida; null mientras el vehículo siga dentro. */
  exit: MovementAudit | null;
  flags?: StayFlags;
  /** Si se anuló el ingreso, la estancia no cuenta para la ocupación ni para el historial. */
  entryAnnulment?: MovementAnnulment;
  /** Salidas que se anularon; la más reciente al final. */
  annulledExits?: AnnulledExit[];
}

/** true si la estancia sigue abierta y su ingreso no fue anulado: el vehículo está dentro. */
export function isInside(stay: ParkingStay): boolean {
  return stay.exitedAt === null && !stay.entryAnnulment;
}

export type MovementKind = 'entry' | 'exit';

export const MOVEMENT_LABELS: Record<MovementKind, string> = {
  entry: 'Ingreso',
  exit: 'Salida',
};

/** Un ingreso o una salida. No se guarda aparte: se deriva de las estancias. */
export interface ParkingMovement {
  /** `<estancia>:entry`, `<estancia>:exit` o `<estancia>:exit-anulada-<n>`. */
  id: string;
  kind: MovementKind;
  at: Date;
  stay: ParkingStay;
  audit: MovementAudit;
  /** Anulación del movimiento, o null si sigue vigente. */
  annulment: MovementAnnulment | null;
}

/**
 * Convierte estancias en movimientos, del más reciente al más antiguo.
 *
 * Incluye los anulados, marcados con su anulación: la bitácora de portería los
 * muestra para que quede constancia. Si se anuló el ingreso, la salida de esa
 * estancia también cuenta como anulada. Una salida sin ingreso (4.6) da solo
 * la salida: su ingreso no ocurrió en portería.
 *
 * @param stays Estancias en cualquier orden.
 * @returns Un movimiento por cada ingreso y por cada salida registrada.
 */
export function movementsOf(stays: readonly ParkingStay[]): ParkingMovement[] {
  const movements: ParkingMovement[] = [];

  for (const stay of stays) {
    const entryAnnulment = stay.entryAnnulment ?? null;

    if (!stay.flags?.missingEntry) {
      movements.push({
        id: `${stay.id}:entry`,
        kind: 'entry',
        at: stay.enteredAt,
        stay,
        audit: stay.entry,
        annulment: entryAnnulment,
      });
    }

    if (stay.exitedAt && stay.exit) {
      movements.push({
        id: `${stay.id}:exit`,
        kind: 'exit',
        at: stay.exitedAt,
        stay,
        audit: stay.exit,
        annulment: entryAnnulment,
      });
    }

    stay.annulledExits?.forEach((annulled, index) =>
      movements.push({
        id: `${stay.id}:exit-anulada-${index}`,
        kind: 'exit',
        at: annulled.exitedAt,
        stay,
        audit: annulled.audit,
        annulment: annulled.annulment,
      }),
    );
  }

  return movements.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * Cuenta los vehículos que están dentro, por tipo.
 *
 * @param stays Estancias en cualquier orden; las cerradas y las anuladas se ignoran.
 */
export function occupancyByType(stays: readonly ParkingStay[]): Record<VehicleType, number> {
  const counts: Record<VehicleType, number> = { moto: 0, bicicleta: 0, scooter: 0 };

  for (const stay of stays) {
    if (isInside(stay)) {
      counts[stay.vehicle.type] += 1;
    }
  }

  return counts;
}

/**
 * Indica si un vehículo lleva dentro más horas de las permitidas sin alerta.
 *
 * @param stay Estancia a revisar; una cerrada nunca es larga.
 * @param hours Umbral en horas (ver `PARKING.longStayHours`).
 * @param now Momento de referencia, inyectable para las pruebas.
 */
export function isLongStay(stay: ParkingStay, hours: number, now: Date = new Date()): boolean {
  return isInside(stay) && now.getTime() - stay.enteredAt.getTime() >= hours * 3_600_000;
}

/**
 * Describe la persona para portería: su vínculo o, si es visitante, el motivo.
 *
 * @example stayPersonLabel(stay) // "Visitante · Reunión en Admisiones"
 */
export function stayPersonLabel(stay: ParkingStay): string {
  return stay.subject.kind === 'visitor' ? `Visitante · ${stay.subject.reason}` : 'Comunidad universitaria';
}

/** Inicio del día (00:00 local) de la fecha dada. */
export function startOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

// ---- Historial ----------------------------------------------------------------

export const HISTORY_RANGES = [
  { days: 1, label: '1 día' },
  { days: 7, label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días' },
] as const;

export type HistoryRange = (typeof HISTORY_RANGES)[number]['days'];

const DAY_MS = 86_400_000;

/**
 * Ventanas móviles contadas desde ahora: "7 días" son las últimas 168 horas,
 * no la semana calendario. Así las cuatro opciones se comportan igual.
 */
export function staysWithinDays(
  stays: readonly ParkingStay[],
  days: number,
  now: Date = new Date(),
): ParkingStay[] {
  const from = now.getTime() - days * DAY_MS;
  return stays.filter((stay) => stay.enteredAt.getTime() >= from);
}

/** Cuánto duró la estancia; si sigue en curso, lo que lleva hasta ahora. */
export function stayDurationMs(stay: ParkingStay, now: Date = new Date()): number {
  const end = stay.exitedAt ?? now;
  return Math.max(0, end.getTime() - stay.enteredAt.getTime());
}

/** Ej. "5 h 13 min" o "45 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  const hours = Math.floor(totalMinutes / 60);

  return hours > 0 ? `${hours} h ${totalMinutes % 60} min` : `${totalMinutes} min`;
}
