import { Routes } from '@angular/router';
import { redirectToHome, roleGuard } from './core/guards/auth.guards';

/**
 * Rutas de la aplicación (ADR-010 en planeacion-desarrollo.md).
 *
 * Hay rutas públicas (acceso y visitantes) y un grupo por rol. Cada grupo se
 * protege con `canMatch`: para otro rol el grupo no existe, así que ni se evalúa
 * ni se descarga su código, y la dirección cae en el comodín final, que lleva a
 * cada quien a su propio inicio.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: redirectToHome },
  {
    path: 'login',
    title: 'Uni-parking | Acceso',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },
  {
    path: 'visitantes',
    title: 'Uni-parking | Visitantes',
    loadComponent: () => import('./components/visitor/visitor').then((m) => m.Visitor),
  },
  {
    path: 'admin',
    canMatch: [roleGuard('admin')],
    loadChildren: () => import('./components/admin-dashboard/admin.routes'),
  },
  {
    path: 'seguridad',
    canMatch: [roleGuard('security')],
    loadChildren: () => import('./components/security-dashboard/security.routes'),
  },
  {
    // Las rutas de usuarios (/inicio, /vehiculos/registrar) cuelgan de la raíz,
    // por eso este grupo va después de los que tienen prefijo propio.
    path: '',
    canMatch: [roleGuard('user')],
    loadChildren: () => import('./components/main-dashboard/user.routes'),
  },
  { path: '**', redirectTo: redirectToHome },
];
