import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH_STATE_SUBSCRIBER } from '../core/auth/firebase-auth-session';
import { AuthService, DEMO_ACCOUNTS, type DemoProfile } from '../core/services/auth.service';

/**
 * Abre (o cierra) una sesión de demostración dentro de una prueba.
 *
 * Llamarlo después de configureTestingModule y antes de crear el componente.
 * Los servicios arrancan siempre con los datos de ejemplo: en el entorno de
 * pruebas no hay almacenamiento del navegador del que puedan heredar cambios.
 *
 * Con Firebase configurado de verdad, el constructor de `AuthService` arranca
 * un listener real (`FIREBASE_AUTH_STATE_SUBSCRIBER`) que, sin este stub,
 * intentaría conectarse de verdad y —al no responder nadie en la prueba—
 * podría sobrescribir con `null` la cuenta de demostración que se fija abajo.
 * El stub avisa una sola vez que no hay nadie (equivalente a un dispositivo
 * sin sesión de Firebase) para que `authReady` quede resuelto de inmediato,
 * igual que si Firebase nunca hubiera arrancado.
 *
 * @param profile Cuenta de demostración a usar, o null para cerrar la sesión.
 * @returns El AuthService de la prueba, por si hace falta consultarlo.
 */
export function signInForTest(profile: DemoProfile | null): AuthService {
  try {
    TestBed.overrideProvider(FIREBASE_AUTH_STATE_SUBSCRIBER, {
      useValue: async (onUser: (user: null) => void) => {
        onUser(null);
        return () => {};
      },
    });
  } catch {
    // Ya se instanció AuthService en esta prueba (p. ej. un segundo
    // signInForTest para cambiar de cuenta): el stub del primer intento ya
    // quedó activo, y TestBed no deja sobrescribir un provider dos veces.
  }

  const auth = TestBed.inject(AuthService);
  (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set(
    profile ? DEMO_ACCOUNTS[profile] : null,
  );

  return auth;
}
