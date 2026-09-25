import { Injectable, computed, inject } from '@angular/core';
import { freeSpots } from '../models/parking';
import type { RegisteredVehicle } from '../models/vehicle';
import { statusNote } from '../models/vehicle-registration';
import { AuthService } from './auth.service';
import { StayService } from './stay.service';
import { VehicleRegistrationService } from './vehicle-registration.service';

/**
 * Datos del parqueadero para el dashboard del usuario institucional.
 *
 * Solo expone lo de quien tiene la sesión abierta (ADR-010): sus vehículos y su
 * historial. La ocupación es la misma que ve portería, porque ambas salen de
 * {@link StayService}.
 */
@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly auth = inject(AuthService);
  private readonly registrations = inject(VehicleRegistrationService);
  private readonly staysStore = inject(StayService);

  /**
   * "Mis vehículos" son las solicitudes de registro del usuario: un vehículo
   * pendiente o rechazado también ocupa cupo hasta que lo elimine.
   */
  readonly vehicles = computed<RegisteredVehicle[]>(() =>
    this.registrations.mine().map((registration) => ({
      ...registration.vehicle,
      id: registration.id,
      approval: registration.status,
      registeredAt: registration.submittedAt,
      statusNote: statusNote(registration),
    })),
  );

  /** Cupos por tipo de vehículo con su ocupación actual. */
  readonly zones = this.staysStore.zones;

  readonly maxVehicles = this.registrations.maxPerUser;
  readonly canAddVehicle = this.registrations.canRegisterMore;

  /** Estancias del usuario con la sesión abierta, la más reciente primero. */
  readonly stays = computed(() => {
    const uid = this.auth.user()?.uid;
    return uid ? this.staysStore.staysOf(uid) : [];
  });

  /** Estancia sin salida registrada: el vehículo sigue dentro. */
  readonly currentStay = computed(() => this.stays().find((item) => item.exitedAt === null) ?? null);

  readonly totalFreeSpots = computed(() =>
    this.zones().reduce((total, zone) => total + freeSpots(zone), 0),
  );

  readonly totalCapacity = computed(() =>
    this.zones().reduce((total, zone) => total + zone.capacity, 0),
  );

  readonly totalOccupied = computed(() => this.zones().reduce((total, zone) => total + zone.occupied, 0));

  /** Cuántas veces entró el usuario en el mes corriente. */
  readonly entriesThisMonth = computed(() => {
    const now = new Date();

    return this.stays().filter(
      (item) =>
        item.enteredAt.getMonth() === now.getMonth() &&
        item.enteredAt.getFullYear() === now.getFullYear(),
    ).length;
  });

  /**
   * Libera el cupo para registrar otro vehículo. El historial no se toca: cada
   * estancia guarda su propia copia del vehículo.
   */
  removeVehicle(id: string): void {
    this.registrations.remove(id);
  }
}
