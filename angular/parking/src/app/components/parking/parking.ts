import { Component, computed, inject, signal } from '@angular/core';
import { PARKING } from '../../core/config/parking.config';
import { type ParkingZone, formatDuration } from '../../core/models/parking';
import { VEHICLE_TYPES, type VehicleType, vehicleTitle } from '../../core/models/vehicle';
import { ParkingService } from '../../core/services/parking.service';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
import { ZoneAvailability } from '../zone-availability/zone-availability';

/** Nombres de tipo válidos, para no contar un dato suelto que no sea moto, bicicleta o scooter. */
const KNOWN_TYPES = new Set<string>(VEHICLE_TYPES.map((type) => type.value));

function normalizeType(value: string): VehicleType | null {
  const normalized = value.trim().toLowerCase();
  return KNOWN_TYPES.has(normalized) ? (normalized as VehicleType) : null;
}

/**
 * Disponibilidad del parqueadero (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * Sigue el mismo patrón que `SecurityDashboard`: combina, del backend real,
 * los vehículos institucionales autorizados (`VehicleApiService.inside()`) y
 * los visitantes que siguen dentro (`VisitorApiService.findAll()`, filtrando
 * `exited_at`), y los agrupa por tipo contra los cupos configurados en
 * `parking.config.ts`. Es la versión completa del widget "Disponibilidad" que
 * ya vive en `/inicio` — mismo dato, mismo componente `zone-availability`,
 * aquí con la ficha completa y no solo un resumen.
 *
 * "Estado de tu vehículo" sigue viniendo de `ParkingService` (demo): el
 * backend todavía no tiene un módulo de estancias/movimientos, así que no hay
 * nada real de qué conectar ahí (ver PEN-020 en planeacion-desarrollo.md).
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

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly zones = signal<ParkingZone[]>(PARKING.zones.map((zone) => ({ ...zone, occupied: 0 })));

  protected readonly totalFree = computed(() =>
    this.zones().reduce((total, zone) => total + Math.max(0, zone.capacity - zone.occupied), 0),
  );
  protected readonly totalCapacity = computed(() => this.zones().reduce((total, zone) => total + zone.capacity, 0));
  protected readonly institutionalInside = signal(0);
  protected readonly visitorsInside = signal(0);

  /** Estado del propio vehículo; sigue en demo (no hay módulo de estancias real). */
  protected readonly currentStay = this.parking.currentStay;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [vehicles, visitors] = await Promise.all([this.vehicleApi.inside(), this.visitorApi.findAll()]);
      this.applyCounts(vehicles, visitors);
    } catch {
      this.error.set('No pudimos consultar la disponibilidad real. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }

  private applyCounts(vehicles: readonly BackendVehicle[], visitors: readonly BackendVisitor[]): void {
    const counts: Record<VehicleType, number> = { moto: 0, bicicleta: 0, scooter: 0 };

    for (const vehicle of vehicles) {
      const type = normalizeType(vehicle.type);
      if (type) {
        counts[type] += 1;
      }
    }

    let visitorsCount = 0;

    for (const visitor of visitors) {
      if (visitor.exited_at) {
        continue;
      }

      visitorsCount += 1;
      const type = normalizeType(visitor.type_vehicle);
      if (type) {
        counts[type] += 1;
      }
    }

    this.institutionalInside.set(vehicles.length);
    this.visitorsInside.set(visitorsCount);
    this.zones.set(PARKING.zones.map((zone) => ({ ...zone, occupied: counts[zone.accepts] })));
  }
}
