/**
 * Habla con el módulo de parqueadero del backend real, desde el panel del
 * estudiante (fase de conexión; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * El backend expone este módulo en dos rutas distintas: `/parkingZone` para
 * la capacidad y disponibilidad por tipo de vehículo, y `/parking` para el
 * historial de entradas/salidas y el estado actual de un vehículo, ambos por
 * placa. Sigue el mismo patrón que los demás: un servicio por módulo del
 * backend, con la forma exacta que devuelve cada endpoint.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';

/** Capacidad y disponibilidad de una zona, tal como la devuelve el backend. */
export interface BackendParkingZone {
  id: number;
  vehicleType: string;
  totalCapacity: number;
  availableSpaces: number;
}

/** Un ingreso (y su salida, si ya ocurrió) de un vehículo institucional o un visitante. */
export interface BackendAccessRecord {
  id: number;
  plate: string | null;
  visitorId: number | null;
  zoneType: string;
  entryDateTime: string;
  exitDateTime: string | null;
}

/** Resumen del estado actual de un vehículo, por placa. */
export interface BackendVehicleStatus {
  plate: string;
  isInside: boolean;
  entryDateTime: string | null;
  exitDateTime: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParkingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrlZones = `${environment.apiUrl}/parkingZone`;
  private readonly baseUrlParking = `${environment.apiUrl}/parking`;

  /** Capacidad y disponibilidad de las tres zonas. */
  zones(): Promise<BackendParkingZone[]> {
    return firstValueFrom(this.http.get<BackendParkingZone[]>(this.baseUrlZones));
  }

  /** Capacidad y disponibilidad de una sola zona, por tipo de vehículo. */
  zoneByType(vehicleType: string): Promise<BackendParkingZone> {
    return firstValueFrom(this.http.get<BackendParkingZone>(`${this.baseUrlZones}/${vehicleType}`));
  }

  /** Historial completo de entradas y salidas de un vehículo, del más antiguo al más reciente. */
  history(plate: string): Promise<BackendAccessRecord[]> {
    return firstValueFrom(this.http.get<BackendAccessRecord[]>(`${this.baseUrlParking}/historical/${plate}`));
  }

  /**
   * Si el vehículo está dentro del parqueadero ahora mismo, y desde cuándo.
   * Sin uso todavía: `ParkingService` deriva lo mismo de `history()` (el
   * registro con `exitDateTime: null`, si existe) para no duplicar llamadas
   * cuando ya se necesita el historial completo de todas formas.
   */
  status(plate: string): Promise<BackendVehicleStatus> {
    return firstValueFrom(this.http.get<BackendVehicleStatus>(`${this.baseUrlParking}/status/${plate}`));
  }
}
