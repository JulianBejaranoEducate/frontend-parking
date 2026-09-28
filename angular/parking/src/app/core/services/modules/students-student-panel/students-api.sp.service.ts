/**
 * Habla con el módulo de usuarios del backend real, desde el panel del
 * estudiante (fase de conexión; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * Sigue el mismo patrón que `VisitorApiService` y `VehiclesApiService`: un
 * servicio por módulo del backend. El único endpoint en alcance por ahora es
 * `GET /users/:id`, que trae al usuario con sus vehículos institucionales
 * anidados — es la fuente real de "Mis vehículos" en el dashboard.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';

/**
 * Vehículo tal como viaja anidado en la respuesta de `GET /users/:id`: trae el
 * dueño como `id_owner` (el uid plano). Es una forma distinta de la que
 * devuelve `GET /vehicles` (`VehicleApiService.BackendVehicle`, con el dueño
 * como objeto completo) — mismo backend, dos formas según el endpoint.
 */
export interface BackendUserVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  /** true = está dentro del parqueadero ahora mismo. */
  is_authorized: boolean;
  id_owner: string;
}

export interface BackendStudent {
  id: string;
  name: string;
  email: string;
  roleId: string;
  vehicles: BackendUserVehicle[];
  status_user: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /** El usuario con sesión y sus vehículos institucionales, tal como los tiene el backend. */
  findById(id: string): Promise<BackendStudent> {
    return firstValueFrom(this.http.get<BackendStudent>(`${this.baseUrl}/${id}`));
  }
}
