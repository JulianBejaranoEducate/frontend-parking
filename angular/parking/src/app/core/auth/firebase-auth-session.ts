import { InjectionToken } from '@angular/core';
import type { Unsubscribe, User } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../config/firebase.config';

export type FirebaseAuthStateListener = (user: User | null) => void;
export type FirebaseAuthStateSubscriber = (
  onUser: FirebaseAuthStateListener,
  onError: (error: Error) => void,
) => Promise<Unsubscribe>;

export async function subscribeToFirebaseAuthState(
  onUser: FirebaseAuthStateListener,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const [appSdk, authSdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = appSdk.getApps()[0] ?? appSdk.initializeApp(FIREBASE_CONFIG);

  return authSdk.onIdTokenChanged(authSdk.getAuth(app), onUser, onError);
}

export const FIREBASE_AUTH_STATE_SUBSCRIBER = new InjectionToken<FirebaseAuthStateSubscriber>(
  'FIREBASE_AUTH_STATE_SUBSCRIBER',
  { providedIn: 'root', factory: () => subscribeToFirebaseAuthState },
);