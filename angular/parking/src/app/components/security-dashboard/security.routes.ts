import type { Routes } from '@angular/router';
import { provideDashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { DashboardLayout } from '../dashboard-layout/dashboard-layout';
import { securityNavigation } from './security-navigation';

/**
 * Rutas del personal de seguridad, bajo `/seguridad`. Solo se cargan para el
 * rol `security` (ver `roleGuard` en app.routes.ts).
 */
const SECURITY_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    providers: [provideDashboardNavigation(securityNavigation)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        // :section elige la vista: resumen o turno.
        path: ':section',
        title: 'Uni-parking | Seguridad',
        loadComponent: () => import('./security-dashboard').then((m) => m.SecurityDashboard),
      },
    ],
  },
];

export default SECURITY_ROUTES;
