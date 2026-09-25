import { computed, inject } from '@angular/core';
import type { DashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { IncidentService } from '../../core/services/incident.service';
import { VehicleRegistrationService } from '../../core/services/vehicle-registration.service';

/** Secciones del dashboard de administración, en el orden del menú. */
export const ADMIN_SECTIONS = [
  'resumen',
  'pendientes',
  'aprobados',
  'rechazados',
  'actualizaciones',
  'estadisticas',
  'incidencias',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

/** Iconos del menú, en el lienzo de 24×24. */
const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  pendientes: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-1 3v6l5 3 1-1.7-4-2.3V7z',
  aprobados: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-1.4 14.6L6 12l1.4-1.4 3.2 3.2 6-6L18 9.2z',
  rechazados:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m3.6 5L17 8.4 13.4 12l3.6 3.6-1.4 1.4-3.6-3.6L8.4 17 7 15.6 10.6 12 7 8.4 8.4 7l3.6 3.6z',
  actualizaciones:
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zm-7-7.2V18h2v-5.2l1.6 1.6L16 13l-4-4-4 4 1.4 1.4z',
  estadisticas: 'M4 20h16v2H4a2 2 0 0 1-2-2V3h2zm3-2V9h3v9zm5 0V4h3v14zm5 0v-6h3v6z',
  incidencias: 'M12 2 1 21h22zm0 4 7.5 13h-15zM11 10h2v5h-2zm0 6h2v2h-2z',
} satisfies Record<AdminSection, string>;

/**
 * Menú del dashboard de administración.
 *
 * Solo lleva contador lo que espera a la administración: solicitudes por
 * revisar e incidencias sin resolver. Las actualizaciones esperan a la persona,
 * así que no suman.
 */
export function adminNavigation(): DashboardNavigation {
  const registrations = inject(VehicleRegistrationService);
  const incidents = inject(IncidentService);

  return {
    context: 'Administración',
    items: computed(() => [
      { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/admin/resumen' },
      {
        id: 'pendientes',
        label: 'Pendientes',
        icon: ICONS.pendientes,
        route: '/admin/pendientes',
        badge: registrations.pending().length,
        badgeLabel: 'por revisar',
      },
      { id: 'aprobados', label: 'Aprobados', icon: ICONS.aprobados, route: '/admin/aprobados' },
      { id: 'rechazados', label: 'Rechazados', icon: ICONS.rechazados, route: '/admin/rechazados' },
      { id: 'actualizaciones', label: 'Actualizaciones', icon: ICONS.actualizaciones, route: '/admin/actualizaciones' },
      { id: 'estadisticas', label: 'Estadísticas', icon: ICONS.estadisticas, route: '/admin/estadisticas' },
      {
        id: 'incidencias',
        label: 'Incidencias',
        icon: ICONS.incidencias,
        route: '/admin/incidencias',
        badge: incidents.unresolved().length,
        badgeLabel: 'sin resolver',
      },
    ]),
  };
}
