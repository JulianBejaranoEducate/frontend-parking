import { Component, computed, inject, signal } from '@angular/core';
import {
  type HistoryRange,
  averageStayDurationMs,
  entriesByVehicle,
  formatDuration,
  staysWithinDays,
} from '../../core/models/parking';
import { ParkingService } from '../../core/services/parking.service';
import { StayHistory } from '../stay-history/stay-history';

/**
 * Estadísticas personales de uso del parqueadero (Opción A de
 * `docs-claude/06-propuesta-parqueaderos-estadisticas.md`).
 *
 * Es la versión completa del historial que ya vive en `/inicio` (misma
 * fuente, mismo filtro de rango), más dos métricas que ya se podían calcular
 * con esos mismos datos: duración promedio de la estancia y entradas por
 * vehículo.
 *
 * `ParkingService` ya trae el historial real (`GET /parking/historical/:plate`,
 * uno por vehículo del usuario, combinados) — no confundir con
 * `ParkingStatsService`, que es para el dashboard de administración y genera
 * datos simulados con semilla: esto es el historial real de la sesión,
 * filtrado por su dueño.
 */
@Component({
  imports: [StayHistory],
  selector: 'app-stats',
  styleUrl: './stats.css',
  templateUrl: './stats.html',
})
export class Stats {
  private readonly parking = inject(ParkingService);

  protected readonly loading = this.parking.staysLoading;
  protected readonly error = this.parking.staysError;
  protected readonly stays = this.parking.stays;

  /**
   * Periodo elegido, atado con `[(range)]` al selector que vive en
   * `<app-stay-history>`: esta pantalla necesita leerlo de vuelta para que
   * "Duración promedio" y "Entradas por vehículo" usen el mismo periodo que
   * el historial, sin duplicar aquí el selector ni la tabla.
   */
  protected readonly historyRange = signal<HistoryRange>(30);

  protected readonly filteredStays = computed(() =>
    staysWithinDays(this.stays(), this.historyRange()),
  );

  protected readonly averageStayLabel = computed(() => {
    const stays = this.filteredStays();
    return stays.length ? formatDuration(averageStayDurationMs(stays)) : '—';
  });

  /** Entradas por vehículo en el periodo elegido, de más a menos. */
  protected readonly perVehicle = computed(() => entriesByVehicle(this.filteredStays()));
}
