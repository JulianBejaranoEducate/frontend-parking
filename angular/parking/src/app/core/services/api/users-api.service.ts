/**
 * Módulo de usuarios del backend (`/users`).
 *
 * Todas las rutas piden un token de Firebase con permiso (lo agrega
 * `authInterceptor`), salvo `POST /users`, que solo pide el token: es el
 * registro de quien inicia sesión por primera vez y todavía no tiene rol.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environments';

/**
 * Vehículo tal como viaja anidado en `GET /users/:id`: el dueño llega como
 * `id_owner` (el uid), no como objeto.
 */
export interface BackendUserVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  /** Permiso para entrar al parqueadero; no dice si el vehículo está dentro. */
  is_authorized: boolean;
  id_owner: string;
}

/** Usuario tal como lo devuelve el backend (el `User` de dominio). */
export interface BackendUser {
  id: string;
  name: string;
  email: string;
  /** 1 userEstandar · 2 vigilante · 3 administrador · 4 superadmin. */
  roleId: number;
  status_user: boolean;
  /** Solo viene en `GET /users/:id`. */
  vehicles?: BackendUserVehicle[];
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /**
   * Registra a quien acaba de iniciar sesión o, si ya estaba registrado, solo le
   * sincroniza el rol en Firebase (el backend responde 201 o 200). Exige correo
   * institucional.
   *
   * @param name Nombre del perfil, tal como lo trae la cuenta de Microsoft.
   */
  register(name: string): Promise<BackendUser> {
    return firstValueFrom(this.http.post<BackendUser>(this.baseUrl, { name }));
  }

  /** Un usuario con sus vehículos: de aquí sale «Mis vehículos». */
  findById(id: string): Promise<BackendUser> {
    return firstValueFrom(this.http.get<BackendUser>(`${this.baseUrl}/${id}`));
  }

  /** Usuarios dados de baja. */
  listInactive(): Promise<BackendUser[]> {
    return firstValueFrom(this.http.get<BackendUser[]>(`${this.baseUrl}/unactive`));
  }

  /** Reactiva a un usuario dado de baja (`PUT /users/:id`). */
  restore(id: string): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.baseUrl}/${id}`, {}));
  }
}
