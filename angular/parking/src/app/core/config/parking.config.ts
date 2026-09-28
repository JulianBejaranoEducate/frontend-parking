/**
 * Configuración operativa del parqueadero del cliente activo.
 *
 * Igual que la marca (`branding.config.ts`), cada institución tendrá la suya:
 * nombre de la portería, umbrales de alerta y, por zona, su id y nombre
 * visible. Ya no presta el cupo de cada zona (ADR-021): la capacidad real ya
 * la expone el backend (`GET /parkingZone`, ver `ParkingService`), que es de
 * donde sale para el panel de usuario — un número aquí solo invitaría a
 * pensar que cambiarlo cambia algo real, y no es así.
 */
import type { ZoneCapacity } from '../models/parking';
import type { VehicleType } from '../models/vehicle';

export interface ParkingConfig {
  /** Portería desde la que trabaja el personal de seguridad. */
  postName: string;
  /** Una zona por tipo de vehículo (ADR-008), en el orden en que se muestran. */
  zones: readonly ZoneCapacity[];
  /** Horas dentro a partir de las cuales un vehículo genera alerta en portería. */
  longStayHours: number;
}

/** Parqueadero activo: Uniempresarial, con una sola portería. */
export const PARKING: ParkingConfig = {
  postName: 'Portería principal',
  zones: [
    { id: 'motos', name: 'Zona de motos', accepts: 'moto' },
    { id: 'bicicletas', name: 'Zona de bicicletas', accepts: 'bicicleta' },
    { id: 'scooters', name: 'Zona de scooters', accepts: 'scooter' },
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
