import { Injectable, computed, inject } from '@angular/core';
import { freeSpots } from '../models/parking';
import { AuthService } from './auth.service';
import { StayService } from './stay.service';

/**
 * Datos del parqueadero para el dashboard del usuario institucional.
 *
 * Solo expone lo de quien tiene la sesión abierta (ADR-010): su historial. La
 * ocupación es la misma que ve portería, porque ambas salen de
 * {@link StayService}. "Mis vehículos" ya no sale de aquí: el dashboard los
 * trae directo del backend real (`StudentsApiService`, `GET /users/:id`).
 */
@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly auth = inject(AuthService);
  private readonly staysStore = inject(StayService);

  /** Cupos por tipo de vehículo con su ocupación actual. */
  readonly zones = this.staysStore.zones;

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
}
