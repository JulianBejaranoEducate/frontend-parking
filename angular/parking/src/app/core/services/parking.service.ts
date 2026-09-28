import { Injectable, computed, inject, signal } from '@angular/core';
import { zoneFor } from '../config/parking.config';
import { type ParkingZone, type Stay, freeSpots } from '../models/parking';
import { type DashboardVehicle, toDashboardVehicle } from '../models/vehicle';
import type { VehicleType } from '../models/vehicle';
import { AuthService, SEEDED_OWNER_UID } from './auth.service';
import {
  type BackendAccessRecord,
  type BackendParkingZone,
  ParkingApiService,
} from './modules/parking-student-panel/parking-api.sp.service';
import { StudentsApiService } from './modules/students-student-panel/students-api.sp.service';

function toParkingZone(zone: BackendParkingZone): ParkingZone {
  const type = zone.vehicleType as VehicleType;
  const config = zoneFor(type);

  return {
    id: config.id,
    name: config.name,
    accepts: type,
    capacity: zone.totalCapacity,
    occupied: zone.totalCapacity - zone.availableSpaces,
  };
}

function toStay(record: BackendAccessRecord, vehicle: DashboardVehicle): Stay {
  const type = record.zoneType as VehicleType;

  return {
    id: String(record.id),
    vehicle,
    zoneName: zoneFor(type).name,
    enteredAt: new Date(record.entryDateTime),
    exitedAt: record.exitDateTime ? new Date(record.exitDateTime) : null,
  };
}

/**
 * Datos del parqueadero para el dashboard del usuario institucional, ya
 * conectados al backend real (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * Solo expone lo de quien tiene la sesión abierta (ADR-010): sus cupos de
 * zona (`GET /parkingZone`) y el historial de todos sus vehículos
 * (`GET /parking/historical/:plate`, uno por vehículo, combinados). "Mis
 * vehículos" no sale de aquí: el dashboard los trae directo de
 * `StudentsApiService` (`GET /users/:id`), que también es de donde este
 * servicio saca las placas para pedir el historial de cada una.
 *
 * `currentStay` se deriva del historial combinado (el registro con
 * `exitDateTime: null`, si existe) en vez de llamar a `GET /parking/status`
 * por cada vehículo: son la misma información, y así no se duplican llamadas
 * cuando de todas formas hace falta el historial completo.
 */
@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly auth = inject(AuthService);
  private readonly studentsApi = inject(StudentsApiService);
  private readonly parkingApi = inject(ParkingApiService);

  // ---- Cupos por zona (GET /parkingZone) -----------------------------------------

  readonly zonesLoading = signal(true);
  readonly zonesError = signal<string | null>(null);
  readonly zones = signal<ParkingZone[]>([]);

  readonly totalFreeSpots = computed(() => this.zones().reduce((total, zone) => total + freeSpots(zone), 0));
  readonly totalCapacity = computed(() => this.zones().reduce((total, zone) => total + zone.capacity, 0));
  readonly totalOccupied = computed(() => this.zones().reduce((total, zone) => total + zone.occupied, 0));

  // ---- Historial de mis vehículos (GET /parking/historical/:plate) --------------

  readonly staysLoading = signal(true);
  readonly staysError = signal<string | null>(null);
  readonly stays = signal<Stay[]>([]);

  /** Estancia sin salida registrada: el vehículo sigue dentro. */
  readonly currentStay = computed(() => this.stays().find((item) => item.exitedAt === null) ?? null);

  /** Cuántas veces entró el usuario en el mes corriente. */
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

  /** Vuelve a consultar la disponibilidad por zona. Expuesto para el botón "Actualizar" de Parqueaderos. */
  async refreshZones(): Promise<void> {
    this.zonesLoading.set(true);
    this.zonesError.set(null);

    try {
      const zones = await this.parkingApi.zones();
      this.zones.set(zones.map(toParkingZone));
    } catch {
      this.zonesError.set('No pudimos consultar la disponibilidad del parqueadero. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.zonesLoading.set(false);
    }
  }

  /** Vuelve a consultar el historial de todos mis vehículos. */
  async refreshStays(): Promise<void> {
    this.staysLoading.set(true);
    this.staysError.set(null);

    try {
      const uid = this.auth.demoMode ? SEEDED_OWNER_UID : (this.auth.user()?.uid ?? '');
      const student = await this.studentsApi.findById(uid);
      const vehicles = student.vehicles.map(toDashboardVehicle);

      const histories = await Promise.all(vehicles.map((vehicle) => this.parkingApi.history(vehicle.id)));

      const stays = vehicles
        .flatMap((vehicle, index) => histories[index].map((record) => toStay(record, vehicle)))
        .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime());

      this.stays.set(stays);
    } catch {
      this.staysError.set('No pudimos consultar tu historial. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.staysLoading.set(false);
    }
  }
}
