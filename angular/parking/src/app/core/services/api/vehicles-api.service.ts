/**
 * Módulo de vehículos de la comunidad del backend (`/vehicles`).
 *
 * `is_authorized` es el permiso para entrar al parqueadero, no dice si el
 * vehículo está dentro: el ingreso y la salida son registros de acceso, que
 * maneja `ParkingApiService` (ADR-021).
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environments';
import type { VehicleType } from '../../models/vehicle';

/** Dueño del vehículo, tal como lo devuelve el backend (el `User` de dominio). */
export interface BackendVehicleOwner {
  id: string;
  name: string;
  email: string;
  roleId: number;
  status_user: boolean;
}

export interface BackendVehicle {
  /**
   * Llave primaria: la placa real (moto) o el identificador que el backend le
   * asigna a lo que no lleva placa (scooter, bicicleta).
   */
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  /** Permiso para entrar al parqueadero. */
  is_authorized: boolean;
  id_owner: string;
  /** El backend lo omite si no pudo cargar al dueño. */
  owner?: BackendVehicleOwner;
}

/** Lo que pide `POST /vehicles` (`CreateVehicle.validation.ts`). */
export interface NewVehicle {
  type: VehicleType;
  brand: string;
  /** Año del modelo. */
  model: number;
  color: string;
  /** Solo la moto lleva placa; sin ella, el backend asigna su propio identificador. */
  plate?: string;
  /** uid de Firebase de quien registra el vehículo. */
  ownerUid: string;
}

@Injectable({ providedIn: 'root' })
export class VehiclesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vehicles`;

  /** Vehículos con permiso para entrar. */
  authorized(): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(this.baseUrl));
  }

  /** Vehículos sin permiso para entrar: los recién registrados y los desautorizados. */
  deauthorized(): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(`${this.baseUrl}/deauthorized`));
  }

  /**
   * Busca un vehículo por placa, tenga o no permiso para entrar:
   * `GET /vehicles/:plate` solo encuentra los autorizados.
   *
   * @returns El vehículo, o null si esa placa no existe.
   */
  async findByPlate(plate: string): Promise<BackendVehicle | null> {
    try {
      return await firstValueFrom(this.http.get<BackendVehicle>(`${this.baseUrl}/${plate}`));
    } catch {
      const unauthorized = await this.deauthorized();
      return unauthorized.find((candidate) => candidate.plate === plate) ?? null;
    }
  }

  /**
   * Registra un vehículo a nombre de quien tiene la sesión. Usar siempre el
   * `plate` de la respuesta para lo que sigue (p. ej. el QR): en scooters y
   * bicicletas lo asigna el backend.
   */
  create(vehicle: NewVehicle): Promise<BackendVehicle> {
    const { ownerUid, plate, ...rest } = vehicle;
    return firstValueFrom(
      this.http.post<BackendVehicle>(this.baseUrl, { ...rest, owner: ownerUid, ...(plate ? { plate } : {}) }),
    );
  }

  /** Le da permiso para entrar (`PATCH /vehicles/:plate`). */
  authorize(plate: string): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${this.baseUrl}/${plate}`, {}));
  }

  /** Le quita el permiso para entrar (`DELETE /vehicles/:plate`). */
  deauthorize(plate: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${plate}`));
  }
}
