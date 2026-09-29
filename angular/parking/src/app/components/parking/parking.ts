import { Component, inject, signal } from '@angular/core';
import { formatDuration } from '../../core/models/parking';
import { vehicleTitle } from '../../core/models/vehicle';
import { ParkingApiService } from '../../core/services/api/parking-api.service';
import { StudentParkingService } from '../../core/services/student-panel/student-parking.service';
import { ZoneAvailability } from '../zone-availability/zone-availability';

/**
 * Disponibilidad del parqueadero para la comunidad.
 *
 * - Capacidad y puestos libres por zona: `StudentParkingService.zones`
 *   (`GET /parkingZone`), el mismo dato del widget "Disponibilidad" de `/inicio`.
 * - "Vehículos dentro", separados en comunidad y visitantes: el conteo de
 *   registros de acceso abiertos (`GET /parking/records/open/count`), sin
 *   placas — la versión completa (`GET /parking/records/open`) es solo para
 *   vigilancia y administración.
 * - "Estado de tu vehículo": `StudentParkingService.currentStay`, que sale del
 *   historial de cada placa (`GET /parking/historical/:plate`).
 */
@Component({
  imports: [ZoneAvailability],
  selector: 'app-parking',
  styleUrl: './parking.css',
  templateUrl: './parking.html',
})
export class Parking {
  private readonly parkingApi = inject(ParkingApiService);
  private readonly parking = inject(StudentParkingService);

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
      const count = await this.parkingApi.openRecordsCount();
      this.institutionalInside.set(count.institutional);
      this.visitorsInside.set(count.visitors);
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
