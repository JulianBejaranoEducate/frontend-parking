import { InjectionToken, type Provider, type Signal } from '@angular/core';

/**
 * Menú de los dashboards (ADR-010 en planeacion-desarrollo.md).
 *
 * El header y el sidebar son los mismos para todos los roles, pero las
 * opciones no: cada grupo de rutas (usuario, administración, seguridad) aporta
 * su propio menú con {@link provideDashboardNavigation}. Así el layout nunca
 * conoce opciones de otro rol, ni siquiera ocultas.
 */

/** Una opción del menú lateral. */
export interface NavigationItem {
  id: string;
  label: string;
  /** Trazado SVG del icono, en el lienzo de 24×24 que usan todas las pantallas. */
  icon: string;
  /** Sin ruta, la opción todavía no lleva a ningún lado: solo marca la selección. */
  route?: string;
  /** Contador visible junto a la opción, p. ej. solicitudes por revisar. */
  badge?: number;
  /** Qué cuenta el contador, para lectores de pantalla: "por revisar". */
  badgeLabel?: string;
}

/** Qué hace el buscador del header en un dashboard. */
export interface DashboardSearch {
  /** Texto de ayuda del campo, p. ej. "Buscar placa, documento o nombre". */
  readonly placeholder: string;
  /** Recibe la búsqueda ya recortada y sin vacíos. */
  readonly submit: (query: string) => void;
}

/** Menú de un dashboard. */
export interface DashboardNavigation {
  /** Texto bajo el nombre del producto, p. ej. "Administración"; null si no hace falta. */
  readonly context: string | null;
  /** Opciones del menú. Es un signal para que los contadores se actualicen solos. */
  readonly items: Signal<readonly NavigationItem[]>;
  /** Buscador del header; sin él, el buscador no hace nada todavía (PEN-005). */
  readonly search?: DashboardSearch;
}

/** Menú del grupo de rutas activo. Lo inyecta el layout de los dashboards. */
export const DASHBOARD_NAVIGATION = new InjectionToken<DashboardNavigation>('DASHBOARD_NAVIGATION');

/**
 * Registra el menú de un grupo de rutas, en su arreglo `providers`.
 *
 * @param factory Construye el menú. Corre en contexto de inyección, así que
 * puede usar `inject()` para leer contadores de los servicios del rol.
 * @example
 * { path: '', component: DashboardLayout, providers: [provideDashboardNavigation(adminNavigation)] }
 */
export function provideDashboardNavigation(factory: () => DashboardNavigation): Provider {
  return { provide: DASHBOARD_NAVIGATION, useFactory: factory };
}
