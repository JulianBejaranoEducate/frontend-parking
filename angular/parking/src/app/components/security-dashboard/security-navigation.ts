import { signal } from '@angular/core';
import type { DashboardNavigation } from '../../core/navigation/dashboard-navigation';

/**
 * Secciones del dashboard de seguridad.
 *
 * Se redujo a lo que hoy tiene una API real detrás (fase de conexión, ver
 * "Conexión frontend-backend" en planeacion-desarrollo.md): ver quién está
 * dentro y escanear el código de un visitante o de un vehículo institucional
 * para registrar su ingreso o su salida. Resumen de cupos, turnos y
 * movimientos históricos vuelven cuando el backend tenga esas APIs.
 */
export const SECURITY_SECTIONS = ['resumen', 'control'] as const;

export type SecuritySection = (typeof SECURITY_SECTIONS)[number];

const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  control: 'M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h3v3h-3zm4 3h3v3h-3zm-4 4h3v3h-3zm4 1h3v2h-3z',
} satisfies Record<SecuritySection, string>;

/** Menú del dashboard de seguridad. Sin contadores ni buscador: no hay turno ni búsqueda todavía. */
export function securityNavigation(): DashboardNavigation {
  return {
    context: 'Seguridad',
    items: signal([
      { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/seguridad/resumen' },
      { id: 'control', label: 'Control de acceso', icon: ICONS.control, route: '/seguridad/control' },
    ]),
  };
}
