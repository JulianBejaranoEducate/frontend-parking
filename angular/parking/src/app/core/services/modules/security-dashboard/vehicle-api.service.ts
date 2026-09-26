/**
 * Habla con el módulo de vehículos del backend real para el ingreso y la
 * salida de usuarios institucionales (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * El backend usa `is_authorized` como "está dentro ahora mismo": autorizar
 * (`PATCH /:plate`) es el ingreso y desautorizar (`DELETE /:plate`, que pese
 * al verbo no borra nada) es la salida. `GET /vehicles` solo devuelve los que
 * están dentro; `GET /vehicles/deauthorized`, los que están afuera.
 *
 * No se puede modificar el backend: `GET /:plate` solo encuentra el vehículo
 * si está dentro, así que para ubicarlo sin importar dónde esté, `findByPlate`
 * revisa también la lista de los que están afuera.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';

/** Dueño del vehículo, tal como lo devuelve el backend (relación completa, no solo el id). */
export interface BackendVehicleOwner {
  id_user: string;
  name_user: string;
  email_user: string;
  role_id_user: string;
  status_user: boolean;
}

export interface BackendVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  /** true = está dentro del parqueadero ahora mismo. */
  is_authorized: boolean;
  owner: BackendVehicleOwner;
}

/** El vehículo, y si la búsqueda lo encontró dentro o afuera. */
export interface VehicleLookup {
  vehicle: BackendVehicle;
  inside: boolean;
}

@Injectable({ providedIn: 'root' })
export class VehicleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vehicles`;

  /** Vehículos institucionales dentro del parqueadero ahora mismo. */
  inside(): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(this.baseUrl));
  }

  /** Vehículos institucionales afuera: nunca entraron, o ya salieron. */
  outside(): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(`${this.baseUrl}/deauthorized`));
  }

  /**
   * Busca el vehículo por placa, esté dentro o afuera.
   *
   * @returns El vehículo y dónde se encontró, o null si esa placa no existe.
   */
  async findByPlate(plate: string): Promise<VehicleLookup | null> {
    try {
      const vehicle = await firstValueFrom(this.http.get<BackendVehicle>(`${this.baseUrl}/${plate}`));
      return { vehicle, inside: true };
    } catch {
      const outside = await this.outside();
      const vehicle = outside.find((candidate) => candidate.plate === plate);
      return vehicle ? { vehicle, inside: false } : null;
    }
  }

  /** Registra el ingreso. */
  authorize(plate: string): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${this.baseUrl}/${plate}`, {}));
  }

  /** Registra la salida. */
  registerExit(plate: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${plate}`));
  }
}
