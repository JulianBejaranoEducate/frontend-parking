import { Injectable } from '@angular/core';
import type { VehicleType } from '../models/vehicle';

/**
 * Estadísticas de uso del parqueadero para la administración.
 *
 * TODO: datos simulados. Saldrán de agregar las entradas y salidas registradas
 * en portería (idealmente precalculadas por una Cloud Function cada noche).
 *
 * Los valores son deterministas por fecha: recargar la página no los cambia,
 * y las pruebas no dependen del azar.
 */

export interface DailyEntries {
  date: Date;
  entries: number;
}

export interface HourlyOccupancy {
  /** Hora de inicio del tramo, 0-23. */
  hour: number;
  /** Ocupación promedio de ese tramo, de 0 a 1. */
  ratio: number;
}

export interface TypeUsage {
  type: VehicleType;
  entries: number;
}

export interface StatsSummary {
  totalEntries: number;
  dailyAverage: number;
  peakHour: number;
  averageStayMinutes: number;
}

/** Perfil típico de un día hábil: picos en la mañana y en la jornada nocturna. */
const HOURLY_PROFILE: readonly [number, number][] = [
  [6, 0.12],
  [7, 0.45],
  [8, 0.72],
  [9, 0.84],
  [10, 0.9],
  [11, 0.87],
  [12, 0.7],
  [13, 0.62],
  [14, 0.68],
  [15, 0.74],
  [16, 0.7],
  [17, 0.66],
  [18, 0.8],
  [19, 0.78],
  [20, 0.55],
  [21, 0.25],
];

/** Reparto de ingresos por tipo de vehículo. */
const TYPE_SHARE: Record<VehicleType, number> = { moto: 0.64, bicicleta: 0.23, scooter: 0.13 };

/** Generador pseudoaleatorio con semilla (mulberry32): mismo día, mismos números. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const dayKey = (date: Date): number => date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();

@Injectable({ providedIn: 'root' })
export class ParkingStatsService {
  /** Ingresos por día, del más antiguo al de hoy. */
  dailyEntries(days: number, today: Date = new Date()): DailyEntries[] {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));

      const random = seeded(dayKey(date));
      const weekday = date.getDay();
      // Entre semana hay clases todo el día; el sábado, media jornada; el domingo casi nada.
      const base = weekday === 0 ? 8 : weekday === 6 ? 70 : 150;

      return { date, entries: Math.round(base * (0.85 + random() * 0.3)) };
    });
  }

  /** Ocupación promedio por hora dentro del periodo. */
  hourlyOccupancy(days: number, today: Date = new Date()): HourlyOccupancy[] {
    const random = seeded(dayKey(today) + days);

    return HOURLY_PROFILE.map(([hour, ratio]) => ({
      hour,
      ratio: Math.min(1, Math.max(0, ratio + (random() - 0.5) * 0.06)),
    }));
  }

  typeUsage(days: number, today: Date = new Date()): TypeUsage[] {
    const total = this.dailyEntries(days, today).reduce((sum, day) => sum + day.entries, 0);

    return (Object.entries(TYPE_SHARE) as [VehicleType, number][])
      .map(([type, share]) => ({ type, entries: Math.round(total * share) }))
      .sort((a, b) => b.entries - a.entries);
  }

  summary(days: number, today: Date = new Date()): StatsSummary {
    const daily = this.dailyEntries(days, today);
    const hourly = this.hourlyOccupancy(days, today);
    const totalEntries = daily.reduce((sum, day) => sum + day.entries, 0);
    const peak = hourly.reduce((best, slot) => (slot.ratio > best.ratio ? slot : best), hourly[0]);
    const random = seeded(dayKey(today) * 3 + days);

    return {
      totalEntries,
      dailyAverage: Math.round(totalEntries / days),
      peakHour: peak.hour,
      averageStayMinutes: Math.round(250 + random() * 30),
    };
  }
}
