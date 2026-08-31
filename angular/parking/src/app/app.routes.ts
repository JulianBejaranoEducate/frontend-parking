import { Routes } from '@angular/router';

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
    path: 'admin',
    title: 'Uni-parking | Administración',
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  { path: '**', redirectTo: 'login' },
];
