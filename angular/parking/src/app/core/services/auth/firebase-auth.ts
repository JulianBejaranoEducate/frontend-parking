import { InjectionToken } from '@angular/core';
import type { Unsubscribe, User } from 'firebase/auth';
import { BRAND } from '../../config/branding.config';
import { FIREBASE_CONFIG, MICROSOFT_TENANT_ID } from '../../config/firebase.config';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { initializeApp, getApps } from 'firebase/app';

// El SDK Web se debe inicializar una vez para que el plugin de Capawesome
// pueda envolverlo automáticamente cuando corra en la Web.
if (getApps().length === 0) {
  initializeApp(FIREBASE_CONFIG);
}

// Envuelve el usuario del plugin para que cumpla con la interfaz de 'firebase/auth' que espera Angular
const wrapUser = (pluginUser: any): User | null => {
  if (!pluginUser) return null;
  return {
    uid: pluginUser.uid,
    email: pluginUser.email,
    displayName: pluginUser.displayName,
    photoURL: pluginUser.photoUrl,
    getIdToken: async (forceRefresh?: boolean) => {
      const res = await FirebaseAuthentication.getIdToken({ forceRefresh: forceRefresh ?? false });
      return res.token;
    },
    getIdTokenResult: async (forceRefresh?: boolean) => {
      const res = await FirebaseAuthentication.getIdTokenResult({ forceRefresh: forceRefresh ?? false });
      return { claims: res.claims } as any;
    }
  } as User;
};

export interface FirebaseAuthGateway {
  signInWithMicrosoft(): Promise<User | null>;
  resolvePendingRedirect(): Promise<User | null>;
  signOut(): Promise<void>;
  currentUser(): Promise<User | null>;
  onAuthStateChanged(onUser: (user: User | null) => void, onError: (error: Error) => void): Promise<Unsubscribe>;
}

const firebaseAuthGateway: FirebaseAuthGateway = {
  async signInWithMicrosoft() {
    const result = await FirebaseAuthentication.signInWithMicrosoft({
      customParameters: [
        { key: 'prompt', value: 'select_account' },
        { key: 'domain_hint', value: BRAND.emailDomain },
        ...(MICROSOFT_TENANT_ID ? [{ key: 'tenant', value: MICROSOFT_TENANT_ID }] : [])
      ],
      scopes: ['user.read']
    });
    return wrapUser(result.user);
  },

  async resolvePendingRedirect() {
    return null;
  },

  async signOut() {
    await FirebaseAuthentication.signOut();
  },

  async currentUser() {
    const result = await FirebaseAuthentication.getCurrentUser();
    return wrapUser(result.user);
  },

  async onAuthStateChanged(onUser) {
    let unmounted = false;
    const listener = await FirebaseAuthentication.addListener('authStateChange', (change) => {
      if (!unmounted) onUser(wrapUser(change.user));
    });
    return (async () => {
      unmounted = true;
      await listener.remove();
    }) as unknown as Unsubscribe;
  }
};

export const FIREBASE_AUTH = new InjectionToken<FirebaseAuthGateway>('FIREBASE_AUTH', {
  providedIn: 'root',
  factory: () => firebaseAuthGateway,
});
