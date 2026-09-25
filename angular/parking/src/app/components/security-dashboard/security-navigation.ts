import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { DashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { ShiftService } from '../../core/services/shift.service';

/**
 * Secciones del dashboard de seguridad, en el orden del menú (sección 4.2 de
 * planeacion-desarrollo.md).
 */
export const SECURITY_SECTIONS = ['resumen', 'control', 'dentro', 'movimientos', 'turno'] as const;

export type SecuritySection = (typeof SECURITY_SECTIONS)[number];

/** Iconos del menú, en el lienzo de 24×24. */
const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  control: 'M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h3v3h-3zm4 3h3v3h-3zm-4 4h3v3h-3zm4 1h3v2h-3z',
  dentro: 'M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v7h-2v-2H7v2H5zm2.2 0h9.6l-1-3H8.2zM7.5 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3',
  movimientos: 'M7 4 3 8l4 4V9h8V7H7zm10 8v3H9v2h8v3l4-4z',
  turno: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm-1.4 14.6L7 13l1.4-1.4 2.2 2.2 5-5L17 10.2z',
} satisfies Record<SecuritySection, string>;

/**
 * Menú del dashboard de seguridad.
 *
 * "Turno" lleva contador cuando hay un turno entregado esperando a que quien
 * tiene la sesión lo reciba. El buscador del header lleva al control de acceso
 * con la búsqueda escrita (placa, documento o nombre).
 */
export function securityNavigation(): DashboardNavigation {
  const shifts = inject(ShiftService);
  const router = inject(Router);

  return {
    context: 'Seguridad',
    items: computed(() => [
      { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/seguridad/resumen' },
      { id: 'control', label: 'Control de acceso', icon: ICONS.control, route: '/seguridad/control' },
      { id: 'dentro', label: 'Vehículos dentro', icon: ICONS.dentro, route: '/seguridad/dentro' },
      { id: 'movimientos', label: 'Movimientos', icon: ICONS.movimientos, route: '/seguridad/movimientos' },
      {
        id: 'turno',
        label: 'Turno',
        icon: ICONS.turno,
        route: '/seguridad/turno',
        badge: shifts.toReceive() ? 1 : undefined,
        badgeLabel: 'turno por recibir',
      },
    ]),
    search: {
      placeholder: 'Buscar placa, documento o nombre',
      submit: (query) => void router.navigate(['/seguridad/control'], { queryParams: { buscar: query } }),
    },
  };
}
