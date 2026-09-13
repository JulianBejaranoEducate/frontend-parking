import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { createDrawerState } from '../../core/layout/drawer-state';
import {
  HISTORY_RANGES,
  type HistoryRange,
  type ParkingStay,
  type ParkingZone,
  ZONE_STATUS_LABELS,
  type ZoneStatus,
  formatDuration,
  freeSpots,
  occupancyRatio,
  stayDurationMs,
  staysWithinDays,
  zoneStatus,
} from '../../core/models/parking';
import {
  APPROVAL_LABELS,
  type RegisteredVehicle,
  vehicleDetails,
  vehicleTitle,
} from '../../core/models/vehicle';
import { AuthService } from '../../core/services/auth.service';
import { ParkingService } from '../../core/services/parking.service';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  imports: [Header, RouterLink, Sidebar],
  selector: 'app-main-dashboard',
  styleUrl: './main-dashboard.css',
  templateUrl: './main-dashboard.html',
})
export class MainDashboard {
  private readonly auth = inject(AuthService);
  private readonly parking = inject(ParkingService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly drawer = createDrawerState();

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

  /** En escritorio el menú arranca desplegado; en móvil, cerrado. */
  protected readonly menuOpen = this.drawer.open;

  protected readonly displayName = computed(() => this.auth.user()?.displayName ?? 'Invitado');

  protected readonly firstName = computed(() => this.displayName().split(' ')[0]);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  protected toggleMenu(): void {
    this.drawer.toggle();
  }

  protected closeMenu(): void {
    this.drawer.closeOnMobile();
  }

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

  // ---- Disponibilidad ------------------------------------------------------------

  protected freeSpots(zone: ParkingZone): number {
    return freeSpots(zone);
  }

  protected occupancyPercent(zone: ParkingZone): number {
    return Math.round(occupancyRatio(zone) * 100);
  }

  protected status(zone: ParkingZone): ZoneStatus {
    return zoneStatus(zone);
  }

  protected statusLabel(zone: ParkingZone): string {
    return ZONE_STATUS_LABELS[zoneStatus(zone)];
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }

  private focusAfterRender(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), { injector: this.injector });
  }
}
