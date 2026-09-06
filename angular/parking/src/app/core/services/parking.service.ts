import { Injectable, computed, signal } from '@angular/core';
import {
  type AccessRecord,
  type CurrentStay,
  type ParkingZone,
  freeSpots,
} from '../models/parking';
import type { Vehicle } from '../models/vehicle';

/**
 * Datos del parqueadero para el dashboard del usuario.
 *
 * TODO: hoy sirve datos de muestra para poder diseñar y revisar las pantallas.
 * Cuando Firestore esté conectado, estas señales se alimentan de la colección
 * del usuario y de la ocupación en vivo de cada zona.
 */

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

const DEMO_VEHICLE: Vehicle = {
  type: 'moto',
  brand: 'Yamaha FZ 2.0',
  color: 'Negro',
  plate: 'KZT45F',
};

const DEMO_ZONES: ParkingZone[] = [
  { id: 'motos', name: 'Zona de motos', accepts: 'moto', capacity: 60, occupied: 47 },
  { id: 'scooters', name: 'Zona de scooters', accepts: 'scooter', capacity: 20, occupied: 18 },
  { id: 'bicicletas', name: 'Zona de bicicletas', accepts: 'bicicleta', capacity: 30, occupied: 11 },
];

const DEMO_HISTORY: AccessRecord[] = [
  { id: 'a1', kind: 'entrada', at: minutesAgo(96), zoneName: 'Zona de motos' },
  { id: 'a2', kind: 'salida', at: minutesAgo(1_530), zoneName: 'Zona de motos' },
  { id: 'a3', kind: 'entrada', at: minutesAgo(1_998), zoneName: 'Zona de motos' },
  { id: 'a4', kind: 'salida', at: minutesAgo(2_970), zoneName: 'Zona de motos' },
  { id: 'a5', kind: 'entrada', at: minutesAgo(3_450), zoneName: 'Zona de motos' },
  { id: 'a6', kind: 'salida', at: minutesAgo(4_410), zoneName: 'Zona de motos' },
];

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly _vehicle = signal<Vehicle | null>(DEMO_VEHICLE);
  private readonly _zones = signal<ParkingZone[]>(DEMO_ZONES);
  private readonly _history = signal<AccessRecord[]>(DEMO_HISTORY);

  /** Vehículo registrado por el usuario. null mientras no haya registrado ninguno. */
  readonly vehicle = this._vehicle.asReadonly();
  readonly zones = this._zones.asReadonly();

  /** Historial en orden descendente: lo más reciente primero. */
  readonly history = computed(() =>
    [...this._history()].sort((a, b) => b.at.getTime() - a.at.getTime()),
  );

  /**
   * Si la marca más reciente es una entrada, el vehículo sigue adentro.
   * Es la información que el usuario busca de un vistazo al abrir la app.
   */
  readonly currentStay = computed<CurrentStay | null>(() => {
    const [latest] = this.history();

    return latest?.kind === 'entrada' ? { since: latest.at, zoneName: latest.zoneName } : null;
  });

  readonly totalFreeSpots = computed(() =>
    this.zones().reduce((total, zone) => total + freeSpots(zone), 0),
  );

  readonly totalCapacity = computed(() =>
    this.zones().reduce((total, zone) => total + zone.capacity, 0),
  );

  /** Cuántas veces entró el usuario en el mes corriente. */
  readonly entriesThisMonth = computed(() => {
    const now = new Date();

    return this.history().filter(
      (record) =>
        record.kind === 'entrada' &&
        record.at.getMonth() === now.getMonth() &&
        record.at.getFullYear() === now.getFullYear(),
    ).length;
  });
}
