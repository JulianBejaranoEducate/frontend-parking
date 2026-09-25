import { inject } from '@angular/core';
import { type CanMatchFn, type RedirectFunction, Router } from '@angular/router';
import { AuthService, type AuthUser, type UserRole } from '../services/auth.service';

/**
 * Barreras de navegación por rol (ADR-010 en planeacion-desarrollo.md).
 *
 * Evitan que la interfaz muestre lo que no le toca a cada persona, pero no
 * protegen los datos: esa protección vive en las reglas de Firestore, que leen
 * el rol de los claims del token (PEN-002).
 */

/** Pantalla de inicio de cada rol. */
export const ROLE_HOME: Record<UserRole, string> = {
  user: '/inicio',
  admin: '/admin/resumen',
  security: '/seguridad/resumen',
  visitor: '/visitantes',
};

/**
 * Dirección a la que debe ir una cuenta al entrar.
 *
 * @param user Cuenta con la sesión abierta, o null.
 * @returns El inicio de su rol, o `/login` si no hay sesión.
 */
export function homeFor(user: AuthUser | null): string {
  return user ? ROLE_HOME[user.role] : '/login';
}

/**
 * Deja entrar a un grupo de rutas solo a los roles indicados.
 *
 * Se usa con `canMatch`, no con `canActivate`: si el rol no coincide, para esa
 * persona el grupo no existe. El enrutador ni siquiera descarga su código y
 * sigue buscando hasta llegar al comodín, que la lleva a su propio inicio
 * con {@link redirectToHome}.
 *
 * @param roles Roles con acceso al grupo.
 * @example
 * { path: 'admin', canMatch: [roleGuard('admin')], loadChildren: () => import('./admin.routes') }
 */
export function roleGuard(...roles: readonly UserRole[]): CanMatchFn {
  return () => {
    const role = inject(AuthService).role();
    return role !== null && roles.includes(role);
  };
}

/**
 * Destino de cualquier dirección que no le corresponde a la sesión actual:
 * el inicio de su rol, o el acceso si no hay sesión.
 */
export const redirectToHome: RedirectFunction = () => {
  return inject(Router).parseUrl(homeFor(inject(AuthService).user()));
};
