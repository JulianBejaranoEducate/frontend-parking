import type { Routes } from '@angular/router';
import { provideDashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { DashboardLayout } from '../dashboard-layout/dashboard-layout';
import { userNavigation } from './user-navigation';

/**
 * Rutas de los usuarios institucionales. Solo se cargan para el rol `user`
 * (ver `roleGuard` en app.routes.ts).
 */
const USER_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    providers: [provideDashboardNavigation(userNavigation)],
    children: [
      {
        path: 'inicio',
        title: 'Uni-parking | Inicio',
        loadComponent: () => import('./main-dashboard').then((m) => m.MainDashboard),
      },
    ],
  },
  {
    // Pantalla completa, sin menú: ?actualizar=<id> abre el formulario solo para reenviar documentos.
    path: 'vehiculos/registrar',
    title: 'Uni-parking | Registrar vehículo',
    loadComponent: () => import('../register-vehicle/register-vehicle').then((m) => m.RegisterVehicle),
  },
];

export default USER_ROUTES;
