import { TestBed } from '@angular/core/testing';
import { AuthService, type AuthUser, DEMO_ACCOUNTS, type DemoProfile } from '../core/services/auth.service';

/**
 * Cuentas para las pruebas: las de los guardias son las mismas de la app; la
 * de comunidad y la de administración solo existen aquí, para comprobar que
 * cada rol ve únicamente su grupo de rutas.
 */
export type TestProfile = DemoProfile | 'user' | 'admin';

export const TEST_ACCOUNTS: Record<TestProfile, AuthUser> = {
  ...DEMO_ACCOUNTS,
  user: {
    uid: 'test-user',
    displayName: 'Estudiante de prueba',
    email: 'estudiante@prueba.test',
    photoUrl: null,
    role: 'user',
    affiliation: 'estudiante',
    program: null,
  },
  admin: {
    uid: 'test-admin',
    displayName: 'Administración de prueba',
    email: 'admin@prueba.test',
    photoUrl: null,
    role: 'admin',
    affiliation: 'administrativo',
    program: null,
  },
};

/**
 * Abre (o cierra) una sesión dentro de una prueba.
 *
 * Llamarlo después de configureTestingModule y antes de crear el componente.
 *
 * @param profile Cuenta a usar, o null para cerrar la sesión.
 * @returns El AuthService de la prueba, por si hace falta consultarlo.
 */
export function signInForTest(profile: TestProfile | null): AuthService {
  const auth = TestBed.inject(AuthService);
  (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set(
    profile ? TEST_ACCOUNTS[profile] : null,
  );

  return auth;
}
