/**
 * Modelo del parqueadero: zonas y estancias.
 *
 * Los puestos no se asignan y no hay sensores: el backend lleva la cuenta de
 * cada zona, y la ocupación es la capacidad menos los puestos libres
 * (ADR-021 en planeacion-desarrollo.md).
 */
import type { Vehicle, VehicleType } from './vehicle';

// ---- Cupos y ocupación ----------------------------------------------------------------

/** Cupo de un tipo de vehículo, tal como lo guarda el backend (`GET /parkingZone`). */
export interface ZoneCapacity {
  /** Identificador de la zona: el id que le dio el backend, como texto. */
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

// ---- Estancias ----------------------------------------------------------------------------

/**
 * Una estancia en el parqueadero, de la entrada a la salida.
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
