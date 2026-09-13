import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
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
    path: 'inicio',
    title: 'Uni-parking | Inicio',
    loadComponent: () => import('./components/main-dashboard/main-dashboard').then((m) => m.MainDashboard),
  },
  {
    // ?actualizar=<id> abre el formulario solo para reenviar documentos.
    path: 'vehiculos/registrar',
    title: 'Uni-parking | Registrar vehículo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/register-vehicle/register-vehicle').then((m) => m.RegisterVehicle),
  },
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/resumen' },
  {
    // :section elige la vista; ?solicitud=<id> abre la revisión de una solicitud.
    path: 'admin/:section',
    title: 'Uni-parking | Administración',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  { path: '**', redirectTo: 'login' },
];
