import { Injectable, inject, signal } from '@angular/core';
import { type DashboardVehicle, toDashboardVehicle } from '../../models/vehicle';
import { UsersApiService } from '../api/users-api.service';
import { AuthService } from '../auth/auth.service';

/**
 * Vehículos de quien tiene la sesión, ya traducidos para pantalla
 * (`GET /users/:id`, que los trae anidados).
 *
 * Es el punto único de esta consulta para «Mis vehículos», «Vehículos», el
 * registro y el historial. `refresh()` reutiliza la consulta en curso si ya hay
 * una, así que dos pantallas que la piden al mismo tiempo comparten una sola
 * llamada HTTP.
 */
@Injectable({ providedIn: 'root' })
export class StudentVehiclesService {
  private readonly auth = inject(AuthService);
  private readonly usersApi = inject(UsersApiService);

  private pending: Promise<DashboardVehicle[]> | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly vehicles = signal<DashboardVehicle[]>([]);

  /**
   * Vuelve a consultar los vehículos. Deja el error en `error()` y además
   * rechaza la promesa, para que el historial también pueda mostrar su aviso.
   */
  refresh(): Promise<DashboardVehicle[]> {
    if (this.pending) {
      return this.pending;
    }

    this.loading.set(true);
    this.error.set(null);

    this.pending = this.usersApi
      .findById(this.auth.effectiveUid())
      .then((user) => {
        const vehicles = (user.vehicles ?? []).map(toDashboardVehicle);
        this.vehicles.set(vehicles);
        return vehicles;
      })
      .catch((error: unknown) => {
        this.error.set('No pudimos consultar tus vehículos. Revisa tu conexión e inténtalo de nuevo.');
        throw error;
      })
      .finally(() => {
        this.loading.set(false);
        this.pending = null;
      });

    return this.pending;
  }
}
