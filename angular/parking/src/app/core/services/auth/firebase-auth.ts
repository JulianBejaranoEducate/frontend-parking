/**
 * Capa delgada sobre el SDK de Firebase: acceso con Microsoft, cierre de
 * sesión y la cuenta con la sesión abierta.
 *
 * El SDK se carga con import dinámico dentro de cada función: este archivo se
 * puede importar sin que sus cientos de kilobytes entren en el paquete inicial,
 * y la pantalla de acceso pinta de inmediato.
 */
import { InjectionToken } from '@angular/core';
import type { Auth, Unsubscribe, User } from 'firebase/auth';
import { BRAND } from '../../config/branding.config';
import { FIREBASE_CONFIG, MICROSOFT_TENANT_ID } from '../../config/firebase.config';

/** Lo que la app usa de Firebase Auth. Las pruebas lo reemplazan con {@link FIREBASE_AUTH}. */
export interface FirebaseAuthGateway {
  /**
   * Inicia sesión con Microsoft. En web abre un popup; en la app nativa no hay
   * popup, así que navega a Microsoft y devuelve null: la app se recarga y el
   * resultado se recoge después con `resolvePendingRedirect`.
   */
  signInWithMicrosoft(useRedirect: boolean): Promise<User | null>;
  /** Recoge la cuenta al volver de Microsoft en la app nativa; null si no había un acceso pendiente. */
  resolvePendingRedirect(): Promise<User | null>;
  signOut(): Promise<void>;
  /** La cuenta con la sesión abierta, o null. */
  currentUser(): Promise<User | null>;
  /**
   * Avisa cada vez que cambia la sesión o se renueva el token (ahí llegan los
   * cambios de rol). La primera llamada llega en cuanto Firebase restaura la
   * sesión guardada, o con null si no había.
   */
  onAuthStateChanged(onUser: (user: User | null) => void, onError: (error: Error) => void): Promise<Unsubscribe>;
}

async function firebaseAuth(): Promise<Auth> {
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  return getAuth(getApps()[0] ?? initializeApp(FIREBASE_CONFIG));
}

/** Implementación real, sobre el proyecto de Firebase de `firebase.config.ts`. */
const firebaseAuthGateway: FirebaseAuthGateway = {
  async signInWithMicrosoft(useRedirect) {
    const [{ OAuthProvider, signInWithPopup, signInWithRedirect }, auth] = await Promise.all([
      import('firebase/auth'),
      firebaseAuth(),
    ]);

    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({
      prompt: 'select_account',
      // Sugiere el dominio institucional en la pantalla de Microsoft.
      domain_hint: BRAND.emailDomain,
      ...(MICROSOFT_TENANT_ID ? { tenant: MICROSOFT_TENANT_ID } : {}),
    });
    provider.addScope('user.read');

    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    return (await signInWithPopup(auth, provider)).user;
  },

  async resolvePendingRedirect() {
    const [{ getRedirectResult }, auth] = await Promise.all([import('firebase/auth'), firebaseAuth()]);
    return (await getRedirectResult(auth))?.user ?? null;
  },

  async signOut() {
    const [{ signOut }, auth] = await Promise.all([import('firebase/auth'), firebaseAuth()]);
    await signOut(auth);
  },

  async currentUser() {
    return (await firebaseAuth()).currentUser;
  },

  async onAuthStateChanged(onUser, onError) {
    const [{ onIdTokenChanged }, auth] = await Promise.all([import('firebase/auth'), firebaseAuth()]);
    return onIdTokenChanged(auth, onUser, onError);
  },
};

/** Acceso a Firebase Auth. Las pruebas lo reemplazan (`testing/test-providers.ts`) para no depender de Firebase. */
export const FIREBASE_AUTH = new InjectionToken<FirebaseAuthGateway>('FIREBASE_AUTH', {
  providedIn: 'root',
  factory: () => firebaseAuthGateway,
});
