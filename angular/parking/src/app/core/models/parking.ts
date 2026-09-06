import type { VehicleType } from './vehicle';

/** Una zona del parqueadero, dedicada a un tipo de vehículo. */
export interface ParkingZone {
  id: string;
  name: string;
  accepts: VehicleType;
  capacity: number;
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

export function freeSpots(zone: ParkingZone): number {
  return Math.max(0, zone.capacity - zone.occupied);
}

export function occupancyRatio(zone: ParkingZone): number {
  return zone.capacity > 0 ? Math.min(1, zone.occupied / zone.capacity) : 0;
}

export function zoneStatus(zone: ParkingZone): ZoneStatus {
  if (freeSpots(zone) === 0) {
    return 'full';
  }

  return occupancyRatio(zone) >= FILLING_THRESHOLD ? 'filling' : 'available';
}

export type AccessKind = 'entrada' | 'salida';

/** Un paso por la portería: quedan registrados tanto entradas como salidas. */
export interface AccessRecord {
  id: string;
  kind: AccessKind;
  at: Date;
  zoneName: string;
}

/** Estancia en curso, cuando la última marca fue una entrada sin salida. */
export interface CurrentStay {
  since: Date;
  zoneName: string;
}
