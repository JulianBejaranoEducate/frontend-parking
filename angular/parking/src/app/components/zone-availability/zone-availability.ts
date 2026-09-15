import { Component, input } from '@angular/core';
import {
  type ParkingZone,
  ZONE_STATUS_LABELS,
  type ZoneStatus,
  freeSpots,
  occupancyRatio,
  zoneStatus,
} from '../../core/models/parking';

/**
 * Disponibilidad por tipo de vehículo: nombre de la zona, estado, barra de
 * ocupación y cupos libres.
 *
 * La comparten el dashboard de usuarios y el de seguridad para que la
 * ocupación se vea igual en todo el producto. La barra usa un solo tono porque
 * mide magnitud; el estado va siempre con icono y texto, nunca solo con color.
 */
@Component({
  selector: 'app-zone-availability',
  styleUrl: './zone-availability.css',
  templateUrl: './zone-availability.html',
})
export class ZoneAvailability {
  /** Zonas con su ocupación actual. */
  readonly zones = input.required<readonly ParkingZone[]>();

  /** Muestra también cuántos puestos están en uso (lo necesita portería). */
  readonly showOccupied = input(false);

  /** Puestos libres de la zona. */
  protected freeSpots(zone: ParkingZone): number {
    return freeSpots(zone);
  }

  /** Porcentaje ocupado, redondeado, para el ancho de la barra. */
  protected occupancyPercent(zone: ParkingZone): number {
    return Math.round(occupancyRatio(zone) * 100);
  }

  protected status(zone: ParkingZone): ZoneStatus {
    return zoneStatus(zone);
  }

  protected statusLabel(zone: ParkingZone): string {
    return ZONE_STATUS_LABELS[zoneStatus(zone)];
  }
}
