import { Component, inject, signal } from '@angular/core';
import { formatDuration } from '../../core/models/parking';
import { vehicleTitle } from '../../core/models/vehicle';
import { ParkingService } from '../../core/services/parking.service';
import { ParkingApiService } from '../../core/services/modules/security-dashboard/parking-api.service';

import { ZoneAvailability } from '../zone-availability/zone-availability';

/**
 * Disponibilidad del parqueadero (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * La capacidad y disponibilidad por zona ya son 100% reales
 * (`ParkingService.zones`, `GET /parkingZone`) — es la versión completa del
 * widget "Disponibilidad" que ya vive en `/inicio` (mismo dato, mismo
 * componente `zone-availability`, aquí con la ficha completa).
 *
 * "Vehículos dentro" es un desglose aparte, institucionales vs. visitantes,
 * que `/parkingZone` no distingue (solo da el total por tipo): sigue
 * viniendo de `VehicleApiService.inside()` + `VisitorApiService.findAll()`,
 * igual que antes.
 *
 * "Estado de tu vehículo" también es real (`ParkingService.currentStay`,
 * derivado de `GET /parking/historical/:plate`).
 */
@Component({
  imports: [ZoneAvailability],
  selector: 'app-parking',
  styleUrl: './parking.css',
  templateUrl: './parking.html',
})
export class Parking {
  private readonly parkingApi = inject(ParkingApiService);
  
  private readonly parking = inject(ParkingService);

  protected readonly vehicleTitle = vehicleTitle;

  protected readonly zonesLoading = this.parking.zonesLoading;
  protected readonly zonesError = this.parking.zonesError;
  protected readonly zones = this.parking.zones;
  protected readonly totalFree = this.parking.totalFreeSpots;
  protected readonly totalCapacity = this.parking.totalCapacity;

  protected readonly insideLoading = signal(true);
  protected readonly insideError = signal<string | null>(null);
  protected readonly institutionalInside = signal(0);
  protected readonly visitorsInside = signal(0);

  protected readonly staysLoading = this.parking.staysLoading;
  protected readonly currentStay = this.parking.currentStay;

  constructor() {
    void this.loadInside();
  }

  protected refreshZones(): void {
    void this.parking.refreshZones();
  }

    protected async loadInside(): Promise<void> {
    this.insideLoading.set(true);
    this.insideError.set(null);

    try {
      const records = await this.parkingApi.openRecords();
      const visitors = records.filter((r) => r.visitorId !== null).length;
      const institutional = records.length - visitors;
      
      this.institutionalInside.set(institutional);
      this.visitorsInside.set(visitors);
    } catch {
      this.insideError.set('No pudimos consultar quiAc!n estAc! dentro ahora mismo.');
    } finally {
      this.insideLoading.set(false);
    }
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }
}
