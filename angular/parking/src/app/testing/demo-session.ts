import { TestBed } from '@angular/core/testing';
import { AuthService, DEMO_ACCOUNTS } from '../core/services/auth.service';

/**
 * Abre (o cierra) una sesión de demostración dentro de una prueba.
 *
 * Llamarlo después de configureTestingModule y antes de crear el componente.
 * Los servicios arrancan siempre con los datos de ejemplo: en el entorno de
 * pruebas no hay almacenamiento del navegador del que puedan heredar cambios.
 */
export function signInForTest(profile: 'user' | 'admin' | null): AuthService {
  const auth = TestBed.inject(AuthService);
  (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set(
    profile ? DEMO_ACCOUNTS[profile] : null,
  );

  return auth;
}
