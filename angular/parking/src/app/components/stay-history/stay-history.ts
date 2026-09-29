import { Component, computed, input, model } from '@angular/core';
import {
  HISTORY_RANGES,
  type HistoryRange,
  type Stay,
  formatDuration,
  stayDurationMs,
  staysWithinDays,
} from '../../core/models/parking';
import { vehicleTitle } from '../../core/models/vehicle';

/**
 * Historial de entradas y salidas de los vehículos de la persona con sesión,
 * con su selector de periodo: tabla en escritorio, tarjetas en móvil.
 *
 * Lo comparten `/inicio` (resumen) y `/estadisticas` (versión completa, que
 * además calcula sus propios promedios y agrupados sobre el mismo periodo —
 * por eso el rango es un `model()`: el padre puede leerlo de vuelta cuando lo
 * necesita, sin duplicar aquí el selector ni la tabla). Antes de existir este
 * componente, las dos pantallas repetían la misma plantilla, el mismo CSS y
 * las mismas funciones de formato.
 */
@Component({
  selector: 'app-stay-history',
  styleUrl: './stay-history.css',
  templateUrl: './stay-history.html',
})
export class StayHistory {
  readonly title = input('Historial de entradas y salidas');
  /** Estancias sin filtrar; el propio componente aplica el periodo elegido. */
  readonly stays = input.required<readonly Stay[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  /** Periodo elegido. Dos vías: el padre puede leerlo o fijarlo con `[(range)]`. */
  readonly range = model<HistoryRange>(7);

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly historyRanges = HISTORY_RANGES;
  protected readonly filteredStays = computed(() => staysWithinDays(this.stays(), this.range()));

  protected setHistoryRange(days: HistoryRange): void {
    this.range.set(days);
  }

  /** Ej. "vie, 12 sept". */
  protected formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** Ej. "7:32 a. m." */
  protected formatTime(date: Date): string {
    return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  protected stayDuration(stay: Stay): string {
    return formatDuration(stayDurationMs(stay));
  }
}
