import { Component, inject, signal } from '@angular/core';
import { formatDuration } from '../../core/models/parking';
import { vehicleTitle } from '../../core/models/vehicle';
import { ParkingService } from '../../core/services/parking.service';
import { VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
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
  private readonly vehicleApi = inject(VehicleApiService);
  private readonly visitorApi = inject(VisitorApiService);
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
      const [vehicles, visitors] = await Promise.all([this.vehicleApi.inside(), this.visitorApi.findAll()]);
      this.institutionalInside.set(vehicles.length);
      this.visitorsInside.set(visitors.filter((visitor) => !visitor.exited_at).length);
    } catch {
      this.insideError.set('No pudimos consultar quién está dentro ahora mismo.');
    } finally {
      this.insideLoading.set(false);
    }
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }
}
