import { signal } from '@angular/core';
import type { DashboardNavigation } from '../../core/navigation/dashboard-navigation';

export const SECURITY_SECTIONS = ['resumen', 'control', 'incidencias'] as const;

export type SecuritySection = (typeof SECURITY_SECTIONS)[number];

const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  control: 'M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h3v3h-3zm4 3h3v3h-3zm-4 4h3v3h-3zm4 1h3v2h-3z',
  incidencias: 'M12 2 1 21h22zm0 4 7.5 13h-15zM11 10h2v5h-2zm0 6h2v2h-2z',
} satisfies Record<SecuritySection, string>;

export function securityNavigation(): DashboardNavigation {
  return {
    context: 'Seguridad',
    items: signal([
      { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/seguridad/resumen' },
      { id: 'control', label: 'Control de acceso', icon: ICONS.control, route: '/seguridad/control' },
      { id: 'incidencias', label: 'Reportar Novedad', icon: ICONS.incidencias, route: '/seguridad/incidencias' },
    ]),
  };
}