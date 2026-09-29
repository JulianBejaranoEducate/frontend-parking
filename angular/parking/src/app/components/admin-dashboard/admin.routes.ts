import type { Routes } from '@angular/router';
import { provideDashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { DashboardLayout } from '../dashboard-layout/dashboard-layout';
import { adminNavigation } from './admin-navigation';

/**
 * Rutas de la administración, bajo `/admin`. Solo se cargan para el rol
 * `admin` (ver `roleGuard` en app.routes.ts).
 */
const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    providers: [provideDashboardNavigation(adminNavigation)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        // :section elige la vista; ?solicitud=<id> abre la revisión de una solicitud.
        path: ':section',
        title: 'Uni-parking | Administración',
        loadComponent: () => import('./admin-dashboard').then((m) => m.AdminDashboard),
      },
    ],
  },
];

export default ADMIN_ROUTES;
