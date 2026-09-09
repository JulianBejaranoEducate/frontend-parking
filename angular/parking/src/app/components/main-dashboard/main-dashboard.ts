import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { BRAND } from '../../core/config/branding.config';
import {
  type ParkingZone,
  ZONE_STATUS_LABELS,
  type ZoneStatus,
  freeSpots,
  occupancyRatio,
  zoneStatus,
} from '../../core/models/parking';
import { vehicleLabel } from '../../core/models/vehicle';
import { AuthService } from '../../core/services/auth.service';
import { ParkingService } from '../../core/services/parking.service';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

/** Ancho a partir del cual la barra lateral cabe junto al contenido. */
const DESKTOP_QUERY = '(min-width: 64rem)';

/**
 * matchMedia no existe fuera del navegador (renderizado en servidor, pruebas).
 * Sin ventana se asume móvil, que es el diseño de partida.
 */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DESKTOP_QUERY).matches
    : false;
}

@Component({
  imports: [Header, Sidebar],
  selector: 'app-main-dashboard',
  styleUrl: './main-dashboard.css',
  templateUrl: './main-dashboard.html',
})
export class MainDashboard {
  private readonly auth = inject(AuthService);
  private readonly parking = inject(ParkingService);

  protected readonly brand = BRAND;
  protected readonly vehicleLabel = vehicleLabel;

  protected readonly vehicle = this.parking.vehicle;
  protected readonly zones = this.parking.zones;
  protected readonly history = this.parking.history;
  protected readonly currentStay = this.parking.currentStay;
  protected readonly totalFreeSpots = this.parking.totalFreeSpots;
  protected readonly totalCapacity = this.parking.totalCapacity;
  protected readonly entriesThisMonth = this.parking.entriesThisMonth;

  /** En escritorio el menú arranca desplegado; en móvil, cerrado. */
  protected readonly menuOpen = signal(isDesktop());

  protected readonly displayName = computed(() => this.auth.user()?.displayName ?? 'Invitado');

  protected readonly firstName = computed(() => this.displayName().split(' ')[0]);

  constructor() {
    // Al cruzar el umbral (rotar el celular, redimensionar la ventana) la barra
    // se ajusta sola: desplegada cuando cabe al lado, recogida cuando no.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia(DESKTOP_QUERY);
      const sync = (event: MediaQueryListEvent) => this.menuOpen.set(event.matches);

      query.addEventListener('change', sync);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', sync));
    }
  }

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    // En escritorio la barra convive con el contenido y no hace falta cerrarla
    // cada vez que se elige una opción.
    if (!isDesktop()) {
      this.menuOpen.set(false);
    }
  }

  // ---- Ayudas de presentación ------------------------------------------------

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

  /** Ej. "5 sep, 3:45 p. m." */
  protected formatDateTime(date: Date): string {
    return date.toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /** Ej. "1 h 36 min" — cuánto lleva el vehículo dentro del parqueadero. */
  protected elapsedSince(date: Date): string {
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    const hours = Math.floor(minutes / 60);

    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  }
}
