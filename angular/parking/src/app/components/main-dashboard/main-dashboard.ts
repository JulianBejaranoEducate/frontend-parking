import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  APPROVAL_LABELS,
  type RegisteredVehicle,
  vehicleDetails,
  vehicleTitle,
} from '../../core/models/vehicle';
import { AuthService } from '../../core/services/auth.service';
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
  imports: [RouterLink, ZoneAvailability],
  selector: 'app-main-dashboard',
  styleUrl: './main-dashboard.css',
  templateUrl: './main-dashboard.html',
})
export class MainDashboard {
  private readonly auth = inject(AuthService);
  private readonly parking = inject(ParkingService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly brand = BRAND;
  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;

  protected readonly vehicles = this.parking.vehicles;
  protected readonly maxVehicles = this.parking.maxVehicles;
  protected readonly canAddVehicle = this.parking.canAddVehicle;
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

  /** Vehículo cuya eliminación espera confirmación. Solo uno a la vez. */
  protected readonly pendingDeleteId = signal<string | null>(null);

  /** Mensaje para lectores de pantalla tras una acción que cambia la lista. */
  protected readonly announcement = signal('');

  protected readonly displayName = computed(() => this.auth.user()?.displayName ?? 'Invitado');

  protected readonly firstName = computed(() => this.displayName().split(' ')[0]);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  // ---- Mis vehículos ---------------------------------------------------------

  protected addVehicle(): void {
    if (this.canAddVehicle()) {
      void this.router.navigate(['/vehiculos/registrar']);
    }
  }

  /**
   * Eliminar es irreversible, así que la papelera no borra: pide confirmar en la
   * misma fila. El foco pasa a "Cancelar", la opción segura.
   */
  protected requestDelete(vehicle: RegisteredVehicle): void {
    this.pendingDeleteId.set(vehicle.id);
    this.focusAfterRender(`cancel-delete-${vehicle.id}`);
  }

  protected cancelDelete(vehicle: RegisteredVehicle): void {
    this.pendingDeleteId.set(null);
    this.focusAfterRender(`delete-${vehicle.id}`);
  }

  protected confirmDelete(vehicle: RegisteredVehicle): void {
    this.parking.removeVehicle(vehicle.id);
    this.pendingDeleteId.set(null);
    this.announcement.set(`${vehicleTitle(vehicle)} se eliminó de tus vehículos.`);
    // La fila ya no existe: el foco vuelve a la acción natural siguiente.
    this.focusAfterRender('add-vehicle');
  }

  protected approvalLabel(vehicle: RegisteredVehicle): string {
    return APPROVAL_LABELS[vehicle.approval];
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

  private focusAfterRender(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), { injector: this.injector });
  }
}
