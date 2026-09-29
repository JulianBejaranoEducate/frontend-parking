import { Injectable, computed, inject, signal } from '@angular/core';
import { type ParkingZone, type Stay, freeSpots } from '../../models/parking';
import type { DashboardVehicle } from '../../models/vehicle';
import { type BackendAccessRecord, ParkingApiService, toParkingZone, zoneName } from '../api/parking-api.service';
import { StudentVehiclesService } from './student-vehicles.service';

function toStay(record: BackendAccessRecord, vehicle: DashboardVehicle): Stay {
  return {
    id: String(record.id),
    vehicle,
    zoneName: zoneName(record.zoneType),
    enteredAt: new Date(record.entryDateTime),
    exitedAt: record.exitDateTime ? new Date(record.exitDateTime) : null,
  };
}

/**
 * Datos del parqueadero para el panel de quien tiene la sesión (ADR-010): la
 * disponibilidad por zona (`GET /parkingZone`) y el historial de todos sus
 * vehículos (`GET /parking/historical/:plate`, uno por vehículo, combinados).
 *
 * Las placas salen de `StudentVehiclesService`, la misma consulta de «Mis
 * vehículos», para no pedir dos veces `GET /users/:id`. La estancia en curso se
 * deriva del historial (el registro sin salida) en vez de consultar el estado de
 * cada vehículo aparte.
 */
@Injectable({ providedIn: 'root' })
export class StudentParkingService {
  private readonly vehicles = inject(StudentVehiclesService);
  private readonly parkingApi = inject(ParkingApiService);

  // ---- Cupos por zona -------------------------------------------------------------

  readonly zonesLoading = signal(true);
  readonly zonesError = signal<string | null>(null);
  readonly zones = signal<ParkingZone[]>([]);

  readonly totalFreeSpots = computed(() => this.zones().reduce((total, zone) => total + freeSpots(zone), 0));
  readonly totalCapacity = computed(() => this.zones().reduce((total, zone) => total + zone.capacity, 0));

  // ---- Historial de mis vehículos -------------------------------------------------

  readonly staysLoading = signal(true);
  readonly staysError = signal<string | null>(null);
  readonly stays = signal<Stay[]>([]);

  /** Estancia sin salida registrada: el vehículo sigue dentro. */
  readonly currentStay = computed(() => this.stays().find((item) => item.exitedAt === null) ?? null);

  /** Cuántas veces entró la persona en el mes corriente. */
  readonly entriesThisMonth = computed(() => {
    const now = new Date();

    return this.stays().filter(
      (item) => item.enteredAt.getMonth() === now.getMonth() && item.enteredAt.getFullYear() === now.getFullYear(),
    ).length;
  });

  constructor() {
    void this.refreshZones();
    void this.refreshStays();
  }

  /** Vuelve a consultar la disponibilidad por zona (botón «Actualizar» de Parqueaderos). */
  async refreshZones(): Promise<void> {
    this.zonesLoading.set(true);
    this.zonesError.set(null);

    try {
      this.zones.set((await this.parkingApi.zones()).map(toParkingZone));
    } catch {
      this.zonesError.set('No pudimos consultar la disponibilidad del parqueadero. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.zonesLoading.set(false);
    }
  }

  /** Vuelve a consultar el historial de todos los vehículos de la persona. */
  async refreshStays(): Promise<void> {
    this.staysLoading.set(true);
    this.staysError.set(null);

    try {
      const vehicles = await this.vehicles.refresh();
      const histories = await Promise.all(vehicles.map((vehicle) => this.parkingApi.history(vehicle.id)));

      this.stays.set(
        vehicles
          .flatMap((vehicle, index) => histories[index].map((record) => toStay(record, vehicle)))
          .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime()),
      );
    } catch {
      this.staysError.set('No pudimos consultar tu historial. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.staysLoading.set(false);
    }
  }
}
