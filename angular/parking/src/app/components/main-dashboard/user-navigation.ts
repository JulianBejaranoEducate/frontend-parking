import { signal } from '@angular/core';
import type { DashboardNavigation, NavigationItem } from '../../core/navigation/dashboard-navigation';

/** Opciones del menú de los usuarios institucionales. */
export const USER_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M12 3 4 9v12h5v-7h6v7h5V9z',
    route: '/inicio',
  },
  {
    id: 'registrar-vehiculo',
    label: 'Registrar vehículo',
    icon: 'M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1',
    route: '/vehiculos/registrar',
  },
  {
    id: 'vehiculos',
    label: 'Vehículos',
    icon: 'M5 11l1.5-4.5h11L19 11H5m14 2H5a2 2 0 0 0-2 2v5h2a2 2 0 0 0 4 0h6a2 2 0 0 0 4 0h2v-5a2 2 0 0 0-2-2M7.5 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3',
    route: '/vehiculos',
  },
  {
    id: 'parqueaderos',
    label: 'Parqueaderos',
    icon: 'M5 3h6.5C15.1 3 17 5.2 17 8.4s-1.9 5.4-5.5 5.4H9V21H5zm4 3.4v4h2.2c1.3 0 2-.7 2-2s-.7-2-2-2z',
    route: '/parqueaderos',
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icon: 'M4 20h16v2H4a2 2 0 0 1-2-2V3h2zm3-2V9h3v9zm5 0V4h3v14zm5 0v-6h3v6z',
    route: '/estadisticas',
  },
];

/** Menú del dashboard de usuarios. No lleva contexto: es la vista por defecto del producto. */
export function userNavigation(): DashboardNavigation {
  return { context: null, items: signal(USER_NAVIGATION_ITEMS).asReadonly() };
}
