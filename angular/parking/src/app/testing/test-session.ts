import type { Provider, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type AuthUser, AuthService, type UserRole } from '../core/services/auth/auth.service';
import { FIREBASE_AUTH, type FirebaseAuthGateway } from '../core/services/auth/firebase-auth';

/**
 * Una cuenta ficticia por rol, solo para pruebas. No existen en Firebase ni en
 * el backend: la app nunca las usa fuera de los `*.spec.ts`.
 */
export const TEST_ACCOUNTS: Record<UserRole, AuthUser> = {
  user: {
    uid: 'test-user',
    displayName: 'Estudiante de Prueba',
    email: 'estudiante.prueba@uniempresarial.edu.co',
    photoUrl: null,
    role: 'user',
    affiliation: 'estudiante',
    program: null,
  },
  admin: {
    uid: 'test-admin',
    displayName: 'Administración de Prueba',
    email: 'admin.prueba@uniempresarial.edu.co',
    photoUrl: null,
    role: 'admin',
    affiliation: 'administrativo',
    program: null,
  },
  security: {
    uid: 'test-security',
    displayName: 'Vigilante de Prueba',
    email: 'vigilante.prueba@uniempresarial.edu.co',
    photoUrl: null,
    role: 'security',
    affiliation: 'seguridad',
    program: null,
  },
};

/** Firebase de mentira: arranca sin sesión y nunca sale a la red. */
const firebaseWithoutSession: FirebaseAuthGateway = {
  signInWithMicrosoft: async () => null,
  resolvePendingRedirect: async () => null,
  signOut: async () => {},
  currentUser: async () => null,
  onAuthStateChanged: async (onUser) => {
    onUser(null);
    return () => {};
  },
};

/**
 * Reemplaza Firebase en una prueba que crea `AuthService` sin pasar por
 * {@link signInForTest} (p. ej. porque arma su propia cuenta).
 */
export function provideFirebaseWithoutSession(): Provider {
  return { provide: FIREBASE_AUTH, useValue: firebaseWithoutSession };
}

/**
 * Abre (o cierra) una sesión ficticia dentro de una prueba, sin pasar por
 * Firebase: si la prueba no lo reemplazó ya, lo cambia por uno sin red.
 *
 * Llamarlo después de configureTestingModule y antes de crear el componente.
 *
 * @param role Rol de la cuenta de {@link TEST_ACCOUNTS} a usar, o null para cerrar la sesión.
 * @returns El AuthService de la prueba, por si hace falta consultarlo.
 */
export function signInForTest(role: UserRole | null): AuthService {
  try {
    TestBed.overrideProvider(FIREBASE_AUTH, { useValue: firebaseWithoutSession });
  } catch {
    // El módulo de la prueba ya se creó: Firebase ya quedó definido para esta prueba.
  }

  const auth = TestBed.inject(AuthService);
  (auth as unknown as { _user: WritableSignal<AuthUser | null> })._user.set(role ? TEST_ACCOUNTS[role] : null);

  return auth;
}
