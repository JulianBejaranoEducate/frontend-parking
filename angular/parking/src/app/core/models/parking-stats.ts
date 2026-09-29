/**
 * Forma de las estadísticas de uso que muestra la administración. Todavía no
 * hay datos: saldrán de agregar los registros de acceso cuando el backend los
 * publique.
 */
import type { VehicleType } from './vehicle';

/** Ingresos de un día. */
export interface DailyEntries {
  date: Date;
  entries: number;
}

/** Ocupación promedio de una franja de una hora. */
export interface HourlyOccupancy {
  /** Hora de inicio del tramo, 0-23. */
  hour: number;
  /** Ocupación promedio de ese tramo, de 0 a 1. */
  ratio: number;
}

/** Ingresos del periodo de un tipo de vehículo. */
export interface TypeUsage {
  type: VehicleType;
  entries: number;
}

/** Indicadores del periodo elegido. */
export interface StatsSummary {
  totalEntries: number;
  dailyAverage: number;
  peakHour: number;
  averageStayMinutes: number;
}
