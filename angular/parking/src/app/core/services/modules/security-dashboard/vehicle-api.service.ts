/**
 * Consulta los vehículos de la comunidad en el backend real (rama
 * `camilo-dev`).
 *
 * `is_authorized` es el permiso para entrar al parqueadero, no dice si el
 * vehículo está dentro: el ingreso y la salida son registros de acceso, que
 * maneja `ParkingApiService` (ADR-021).
 *
 * No se puede modificar el backend: `GET /vehicles/:plate` solo encuentra los
 * vehículos autorizados, así que para ubicar uno sin permiso, `findByPlate`
 * revisa también la lista de los no autorizados.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';

/** Dueño del vehículo, tal como lo devuelve el backend (el `User` de dominio, no la fila de la tabla). */
export interface BackendVehicleOwner {
  id: string;
  name: string;
  email: string;
  roleId: number;
  status_user: boolean;
}

export interface BackendVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  /** Permiso para entrar al parqueadero. */
  is_authorized: boolean;
  id_owner: string;
  /** El backend lo omite si no pudo cargar al usuario dueño. */
  owner?: BackendVehicleOwner;
}

@Injectable({ providedIn: 'root' })
export class VehicleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vehicles`;

  /** Vehículos con permiso para entrar: de ahí sale el dueño de los que están dentro. */
  authorized(): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(this.baseUrl));
  }

  /**
   * Busca el vehículo por placa, tenga o no permiso para entrar.
   *
   * @returns El vehículo, o null si esa placa no existe.
   */
  async findByPlate(plate: string): Promise<BackendVehicle | null> {
    try {
      return await firstValueFrom(this.http.get<BackendVehicle>(`${this.baseUrl}/${plate}`));
    } catch {
      const unauthorized = await firstValueFrom(this.http.get<BackendVehicle[]>(`${this.baseUrl}/deauthorized`));
      return unauthorized.find((candidate) => candidate.plate === plate) ?? null;
    }
  }
}
