import { Injectable, computed, inject, signal } from '@angular/core';
import { type ParkingStay, type ParkingZone, freeSpots } from '../models/parking';
import type { RegisteredVehicle, Vehicle } from '../models/vehicle';
import { statusNote } from '../models/vehicle-registration';
import { VehicleRegistrationService } from './vehicle-registration.service';

/**
 * Datos del parqueadero para el dashboard del usuario.
 *
 * TODO: las zonas y las estancias son datos de muestra. Cuando Firestore esté
 * conectado, se alimentan de la ocupación en vivo y del historial del usuario.
 */

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

/** Una fecha de hace `daysAgo` días, a la hora indicada. */
const daysAgoAt = (daysAgo: number, hour: number, minute: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const MOTO: Vehicle = { type: 'moto', brand: 'Yamaha', line: 'FZ 2.0', color: 'Negro', plate: 'KZT45F' };

/** Moto que el usuario ya eliminó: su historial se conserva igual. */
const PREVIOUS_MOTO: Vehicle = { type: 'moto', brand: 'AKT', line: 'NKD 125', color: 'Rojo', plate: 'HBQ82C' };

const DEMO_ZONES: ParkingZone[] = [
  { id: 'motos', name: 'Zona de motos', accepts: 'moto', capacity: 60, occupied: 47 },
  { id: 'scooters', name: 'Zona de scooters', accepts: 'scooter', capacity: 20, occupied: 18 },
  { id: 'bicicletas', name: 'Zona de bicicletas', accepts: 'bicicleta', capacity: 30, occupied: 11 },
];

const stay = (
  id: string,
  vehicle: Vehicle,
  enteredAt: Date,
  exitedAt: Date | null,
): ParkingStay => ({ id, vehicle, zoneName: 'Zona de motos', enteredAt, exitedAt });

const DEMO_STAYS: ParkingStay[] = [
  stay('s-01', MOTO, minutesAgo(96), null),
  stay('s-02', MOTO, daysAgoAt(1, 7, 10), daysAgoAt(1, 16, 5)),
  stay('s-03', MOTO, daysAgoAt(2, 8, 0), daysAgoAt(2, 12, 30)),
  stay('s-04', MOTO, daysAgoAt(4, 6, 45), daysAgoAt(4, 11, 0)),
  stay('s-05', MOTO, daysAgoAt(6, 9, 15), daysAgoAt(6, 17, 40)),
  stay('s-06', MOTO, daysAgoAt(9, 7, 30), daysAgoAt(9, 13, 10)),
  stay('s-07', MOTO, daysAgoAt(12, 10, 0), daysAgoAt(12, 15, 20)),
  stay('s-08', MOTO, daysAgoAt(16, 7, 5), daysAgoAt(16, 12, 45)),
  stay('s-09', PREVIOUS_MOTO, daysAgoAt(20, 8, 20), daysAgoAt(20, 14, 0)),
  stay('s-10', PREVIOUS_MOTO, daysAgoAt(24, 6, 50), daysAgoAt(24, 11, 35)),
  stay('s-11', PREVIOUS_MOTO, daysAgoAt(28, 9, 40), daysAgoAt(28, 18, 10)),
];

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly registrations = inject(VehicleRegistrationService);

  private readonly _zones = signal<ParkingZone[]>(DEMO_ZONES);
  private readonly _stays = signal<ParkingStay[]>(DEMO_STAYS);

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

  readonly zones = this._zones.asReadonly();

  readonly maxVehicles = this.registrations.maxPerUser;
  readonly canAddVehicle = this.registrations.canRegisterMore;

  /** Estancias en orden descendente: la más reciente primero. */
  readonly stays = computed(() =>
    [...this._stays()].sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime()),
  );

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
