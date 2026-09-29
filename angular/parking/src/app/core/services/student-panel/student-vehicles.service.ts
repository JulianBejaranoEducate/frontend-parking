import { Injectable, inject, signal } from '@angular/core';
import { type DashboardVehicle, toDashboardVehicle } from '../models/vehicle';
import { AuthService } from './auth.service';
import { StudentsApiService } from './modules/students-student-panel/students-api.sp.service';

/**
 * Vehículos institucionales del usuario con sesión, ya traducidos para
 * pantalla (`GET /users/:id`, vía `StudentsApiService`).
 *
 * Punto único de esta consulta: antes `MainDashboard`, `Vehicles`,
 * `RegisterVehicle` y `ParkingService` la repetían cada uno por su cuenta
 * (mismo `uid`, mismo `findById`), lo que además hacía que `/inicio` disparara
 * dos veces la misma petición en cada carga (`MainDashboard` y
 * `ParkingService`, cada uno esperando su propia respuesta). `refresh()`
 * reutiliza la consulta en curso si ya hay una, así que dos consumidores que
 * la piden al mismo tiempo comparten una sola llamada HTTP.
 */
@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly auth = inject(AuthService);
  private readonly studentsApi = inject(StudentsApiService);

  private pending: Promise<DashboardVehicle[]> | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly vehicles = signal<DashboardVehicle[]>([]);

  /**
   * Vuelve a consultar los vehículos del usuario con sesión. Si ya hay una
   * consulta en curso, devuelve esa misma promesa en vez de duplicar la
   * petición al backend.
   *
   * Deja `error` en el propio servicio (para quien solo muestre "Mis
   * vehículos") pero también rechaza la promesa: `ParkingService` sigue
   * necesitando enterarse del fallo para mostrar su propio aviso en el
   * historial, sin depender de este servicio para saber si eso pasó.
   */
  refresh(): Promise<DashboardVehicle[]> {
    if (this.pending) {
      return this.pending;
    }

    this.loading.set(true);
    this.error.set(null);

    this.pending = this.studentsApi
      .findById(this.auth.effectiveUid())
      .then((student) => {
        const vehicles = student.vehicles.map(toDashboardVehicle);
        this.vehicles.set(vehicles);
        return vehicles;
      })
      .catch((error: unknown) => {
        this.error.set(
          'No pudimos consultar tus vehículos. Revisa tu conexión e inténtalo de nuevo.',
        );
        throw error;
      })
      .finally(() => {
        this.loading.set(false);
        this.pending = null;
      });

    return this.pending;
  }
}
