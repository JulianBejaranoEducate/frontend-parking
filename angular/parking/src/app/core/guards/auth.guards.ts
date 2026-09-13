import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Barreras de navegación. Evitan que la interfaz muestre lo que no toca, pero
 * no protegen los datos: esa protección vive en las reglas de Firestore.
 */

/** Pide sesión abierta; sin ella, vuelve al acceso. */
export const authGuard: CanActivateFn = () => {
  return inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

/** Solo la administración entra a revisar solicitudes. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return auth.isAdmin() || router.createUrlTree(['/inicio']);
};
