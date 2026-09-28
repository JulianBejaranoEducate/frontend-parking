import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import {
  HISTORY_RANGES,
  type HistoryRange,
  type ParkingStay,
  formatDuration,
  stayDurationMs,
  staysWithinDays,
} from '../../core/models/parking';
import {
  MAX_VEHICLES_PER_USER,
  type DashboardVehicle,
  toDashboardVehicle,
  vehicleDetails,
  vehicleTitle,
} from '../../core/models/vehicle';
import { AuthService, SEEDED_OWNER_UID } from '../../core/services/auth.service';
import { StudentsApiService } from '../../core/services/modules/students-student-panel/students-api.sp.service';
import { ParkingService } from '../../core/services/parking.service';
import { ZoneAvailability } from '../zone-availability/zone-availability';

/**
 * Inicio de los usuarios institucionales: estado de su vehículo, disponibilidad
 * del parqueadero, "Mis vehículos" e historial de entradas y salidas.
 *
 * El header y el menú los pone `DashboardLayout`; este componente solo pinta el
 * contenido de la página.
 */
@Component({
  imports: [ZoneAvailability],
  selector: 'app-main-dashboard',
  styleUrl: './main-dashboard.css',
  templateUrl: './main-dashboard.html',
})
export class MainDashboard {
  private readonly auth = inject(AuthService);
  private readonly parking = inject(ParkingService);
  private readonly studentsApi = inject(StudentsApiService);
  private readonly router = inject(Router);

  protected readonly brand = BRAND;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;

  protected readonly maxVehicles = MAX_VEHICLES_PER_USER;
  protected readonly vehiclesLoading = signal(true);
  protected readonly vehiclesError = signal<string | null>(null);
  protected readonly vehicles = signal<DashboardVehicle[]>([]);
  protected readonly canAddVehicle = computed(() => this.vehicles().length < this.maxVehicles);

  protected readonly zones = this.parking.zones;
  protected readonly currentStay = this.parking.currentStay;
  protected readonly totalFreeSpots = this.parking.totalFreeSpots;
  protected readonly totalCapacity = this.parking.totalCapacity;
  protected readonly entriesThisMonth = this.parking.entriesThisMonth;

  protected readonly historyRanges = HISTORY_RANGES;
  protected readonly historyRange = signal<HistoryRange>(7);
  protected readonly filteredStays = computed(() =>
    staysWithinDays(this.parking.stays(), this.historyRange()),
  );

  protected readonly displayName = computed(() => this.auth.user()?.displayName ?? 'Invitado');

  protected readonly firstName = computed(() => this.displayName().split(' ')[0]);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  // ---- Mis vehículos -----------------------------------------------------------

  constructor() {
    void this.loadVehicles();
  }

  /**
   * Trae los vehículos institucionales de verdad del usuario con sesión
   * (`GET /users/:id`, sin necesidad de Firebase: el backend solo pide el uid
   * en la URL). No hay ni estado de aprobación ni eliminación en el backend
   * real todavía — eso solo existe en la solicitud de demostración que arma el
   * registro (PEN-020); aquí solo se lee y se muestra lo que de verdad quedó
   * guardado, con `is_authorized` como único estado real (dentro/fuera).
   */
  protected async loadVehicles(): Promise<void> {
    this.vehiclesLoading.set(true);
    this.vehiclesError.set(null);

    try {
      const uid = this.auth.demoMode ? SEEDED_OWNER_UID : (this.auth.user()?.uid ?? '');
      const student = await this.studentsApi.findById(uid);
      this.vehicles.set(student.vehicles.map(toDashboardVehicle));
    } catch {
      this.vehiclesError.set('No pudimos consultar tus vehículos. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.vehiclesLoading.set(false);
    }
  }

  protected addVehicle(): void {
    if (this.canAddVehicle()) {
      void this.router.navigate(['/vehiculos/registrar']);
    }
  }

  protected statusLabel(vehicle: DashboardVehicle): string {
    return vehicle.isAuthorized ? 'Activo' : 'Inactivo';
  }

  // ---- Historial ---------------------------------------------------------------

  protected setHistoryRange(days: HistoryRange): void {
    this.historyRange.set(days);
  }

  /** Ej. "vie, 12 sept". */
  protected formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** Ej. "7:32 a. m." */
  protected formatTime(date: Date): string {
    return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  protected stayDuration(stay: ParkingStay): string {
    return formatDuration(stayDurationMs(stay));
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }
}
