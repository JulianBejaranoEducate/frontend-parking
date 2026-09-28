import { Component, computed, inject, signal } from '@angular/core';
import {
  HISTORY_RANGES,
  type HistoryRange,
  type ParkingStay,
  averageStayDurationMs,
  entriesByVehicle,
  formatDuration,
  stayDurationMs,
  staysWithinDays,
} from '../../core/models/parking';
import { vehicleTitle } from '../../core/models/vehicle';
import { ParkingService } from '../../core/services/parking.service';

/**
 * Estadísticas personales de uso del parqueadero (Opción A de
 * `docs-claude/06-propuesta-parqueaderos-estadisticas.md`).
 *
 * Es la versión completa del historial que ya vive en `/inicio` (misma
 * fuente, mismo filtro de rango), más dos métricas nuevas que ya se podían
 * calcular con esos mismos datos: duración promedio de la estancia y
 * entradas por vehículo.
 *
 * A propósito no es un servicio HTTP como Visitantes o Vehículos: HU-21 es
 * "mi historial", y el backend real todavía no tiene ningún módulo de
 * estancias o movimientos (solo `User`, `Vehicle`, `Visitors`, `Incidents`).
 * `ParkingService` ya es el servicio correcto para esto — sigue en modo
 * demostración honestamente, no simula una conexión que no existe (PEN-020
 * en planeacion-desarrollo.md). No confundir con `ParkingStatsService`, que
 * es para el dashboard de administración y genera datos simulados con
 * semilla: esto es el historial real de la sesión, filtrado por su dueño.
 */
@Component({
  selector: 'app-stats',
  styleUrl: './stats.css',
  templateUrl: './stats.html',
})
export class Stats {
  private readonly parking = inject(ParkingService);

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly historyRanges = HISTORY_RANGES;
  protected readonly historyRange = signal<HistoryRange>(30);

  protected readonly filteredStays = computed(() => staysWithinDays(this.parking.stays(), this.historyRange()));

  protected readonly averageStayLabel = computed(() => {
    const stays = this.filteredStays();
    return stays.length ? formatDuration(averageStayDurationMs(stays)) : '—';
  });

  /** Entradas por vehículo en el periodo elegido, de más a menos. */
  protected readonly perVehicle = computed(() => entriesByVehicle(this.filteredStays()));

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
}
