import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { formatDuration } from '../../core/models/parking';
import {
  MAX_VEHICLES_PER_USER,
  type DashboardVehicle,
  vehicleDetails,
  vehicleTitle,
} from '../../core/models/vehicle';
import { AuthService } from '../../core/services/auth.service';
import { ParkingService } from '../../core/services/parking.service';
import { StudentsService } from '../../core/services/students.service';
import { StayHistory } from '../stay-history/stay-history';
import { ZoneAvailability } from '../zone-availability/zone-availability';

/**
 * Inicio de los usuarios institucionales: estado de su vehículo, disponibilidad
 * del parqueadero, "Mis vehículos" e historial de entradas y salidas.
 *
 * El header y el menú los pone `DashboardLayout`; este componente solo pinta el
 * contenido de la página.
 */
@Component({
  imports: [StayHistory, ZoneAvailability],
  selector: 'app-main-dashboard',
  styleUrl: './main-dashboard.css',
  templateUrl: './main-dashboard.html',
})
export class MainDashboard {
  private readonly auth = inject(AuthService);
  private readonly parking = inject(ParkingService);
  private readonly studentsService = inject(StudentsService);
  private readonly router = inject(Router);

  protected readonly brand = BRAND;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;

  protected readonly maxVehicles = MAX_VEHICLES_PER_USER;

  /**
   * Vehículos institucionales de verdad del usuario con sesión (`GET
   * /users/:id`, vía `StudentsService`, compartido con `Vehicles` y
   * `RegisterVehicle`). No hay ni estado de aprobación ni eliminación en el
   * backend real todavía — eso solo existe en la solicitud de demostración
   * que arma el registro (PEN-020); aquí solo se lee y se muestra lo que de
   * verdad quedó guardado, con `is_authorized` como único estado real
   * (dentro/fuera).
   */
  protected readonly vehiclesLoading = this.studentsService.loading;
  protected readonly vehiclesError = this.studentsService.error;
  protected readonly vehicles = this.studentsService.vehicles;
  protected readonly canAddVehicle = computed(() => this.vehicles().length < this.maxVehicles);

  protected readonly zonesLoading = this.parking.zonesLoading;
  protected readonly zonesError = this.parking.zonesError;
  protected readonly zones = this.parking.zones;
  protected readonly currentStay = this.parking.currentStay;
  protected readonly totalFreeSpots = this.parking.totalFreeSpots;
  protected readonly totalCapacity = this.parking.totalCapacity;
  protected readonly entriesThisMonth = this.parking.entriesThisMonth;

  protected readonly staysLoading = this.parking.staysLoading;
  protected readonly staysError = this.parking.staysError;
  protected readonly stays = this.parking.stays;

  protected readonly displayName = computed(() => this.auth.user()?.displayName ?? 'Invitado');

  protected readonly firstName = computed(() => this.displayName().split(' ')[0]);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  constructor() {
    // La promesa la observan los signals de StudentsService; un rechazo no bloquea nada aquí.
    void this.studentsService.refresh().catch(() => {});
  }

  protected addVehicle(): void {
    if (this.canAddVehicle()) {
      void this.router.navigate(['/vehiculos/registrar']);
    }
  }

  protected statusLabel(vehicle: DashboardVehicle): string {
    return vehicle.isAuthorized ? 'Activo' : 'Inactivo';
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }
}
