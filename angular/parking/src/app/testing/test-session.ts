import { TestBed } from '@angular/core/testing';
import { AuthService, DEMO_ACCOUNTS, type DemoProfile } from '../core/services/auth.service';

/**
 * Abre (o cierra) una sesión de demostración dentro de una prueba.
 *
 * Llamarlo después de configureTestingModule y antes de crear el componente.
 * Los servicios arrancan siempre con los datos de ejemplo: en el entorno de
 * pruebas no hay almacenamiento del navegador del que puedan heredar cambios.
 *
 * @param profile Cuenta de demostración a usar, o null para cerrar la sesión.
 * @returns El AuthService de la prueba, por si hace falta consultarlo.
 */
export function signInForTest(profile: DemoProfile | null): AuthService {
  const auth = TestBed.inject(AuthService);
  (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set(
    profile ? DEMO_ACCOUNTS[profile] : null,
  );

  return auth;
}
