/**
 * Configuración operativa del parqueadero del cliente activo.
 *
 * Igual que la marca (`branding.config.ts`), cada institución tendrá la suya:
 * cupos por tipo de vehículo, nombre de la portería y umbrales de alerta.
 * Los cupos de Uniempresarial son de ejemplo hasta que la universidad confirme
 * los reales (pregunta abierta 2 de planeacion-desarrollo.md).
 */
import type { ZoneCapacity } from '../models/parking';
import type { VehicleType } from '../models/vehicle';

export interface ParkingConfig {
  /** Portería desde la que trabaja el personal de seguridad. */
  postName: string;
  /** Un cupo por tipo de vehículo (ADR-008), en el orden en que se muestran. */
  zones: readonly ZoneCapacity[];
  /** Horas dentro a partir de las cuales un vehículo genera alerta en portería. */
  longStayHours: number;
}

/** Parqueadero activo: Uniempresarial, con una sola portería. */
export const PARKING: ParkingConfig = {
  postName: 'Portería principal',
  zones: [
    { id: 'motos', name: 'Zona de motos', accepts: 'moto', capacity: 60 },
    { id: 'bicicletas', name: 'Zona de bicicletas', accepts: 'bicicleta', capacity: 30 },
    { id: 'scooters', name: 'Zona de scooters', accepts: 'scooter', capacity: 20 },
  ],
  longStayHours: 12,
};

/**
 * Zona que recibe un tipo de vehículo.
 *
 * @param type Tipo de vehículo.
 * @param config Configuración a consultar; por defecto, la del cliente activo.
 * @throws Error si la configuración no tiene cupo para ese tipo.
 */
export function zoneFor(type: VehicleType, config: ParkingConfig = PARKING): ZoneCapacity {
  const zone = config.zones.find((candidate) => candidate.accepts === type);

  if (!zone) {
    throw new Error(`La configuración del parqueadero no tiene cupo para "${type}".`);
  }

  return zone;
}
