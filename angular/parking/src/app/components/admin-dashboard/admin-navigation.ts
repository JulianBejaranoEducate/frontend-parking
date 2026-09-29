import { signal, inject } from '@angular/core';
import type { DashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { IncidentService } from '../../core/services/incident.service';

export const ADMIN_SECTIONS = [
  'resumen',
  'pendientes',
  'aprobados',
  'usuarios',
  'incidencias',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  pendientes: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-1 3v6l5 3 1-1.7-4-2.3V7z',
  aprobados: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-1.4 14.6L6 12l1.4-1.4 3.2 3.2 6-6L18 9.2z',
  usuarios: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  incidencias: 'M12 2 1 21h22zm0 4 7.5 13h-15zM11 10h2v5h-2zm0 6h2v2h-2z',
} satisfies Record<AdminSection, string>;

export function adminNavigation(): DashboardNavigation {
  const incidents = inject(IncidentService);
  return {
    context: 'Administracion',
    items: signal([
      { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/admin/resumen' },
      { id: 'pendientes', label: 'Pendientes', icon: ICONS.pendientes, route: '/admin/pendientes' },
      { id: 'aprobados', label: 'Aprobados', icon: ICONS.aprobados, route: '/admin/aprobados' },
      { id: 'usuarios', label: 'Usuarios', icon: ICONS.usuarios, route: '/admin/usuarios' },
      { id: 'incidencias', label: 'Incidencias', icon: ICONS.incidencias, route: '/admin/incidencias', badge: incidents.incidents().filter((i) => i.status === 'open').length || undefined },
    ]).asReadonly(),
  };
}