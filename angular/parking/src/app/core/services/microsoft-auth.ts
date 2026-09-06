/**
 * Capa delgada sobre el SDK de Firebase para el acceso con Microsoft.
 *
 * Vive en su propio módulo porque AuthService lo carga con un import dinámico:
 * así el peso de firebase/auth solo se descarga cuando la persona pulsa
 * "Iniciar sesión", y la pantalla de acceso pinta de inmediato.
 */
import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  OAuthProvider,
  type User,
  getAuth,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { BRAND } from '../config/branding.config';
import { FIREBASE_CONFIG, MICROSOFT_TENANT_ID } from '../config/firebase.config';

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
}

export function firebaseAuth(): Auth {
  return getAuth(app());
}

function microsoftProvider(): OAuthProvider {
  const provider = new OAuthProvider('microsoft.com');
  const parameters: Record<string, string> = {
    prompt: 'select_account',
    // Sugiere el dominio institucional en la pantalla de Microsoft.
    domain_hint: BRAND.emailDomain,
  };

  if (MICROSOFT_TENANT_ID) {
    parameters['tenant'] = MICROSOFT_TENANT_ID;
  }

  provider.setCustomParameters(parameters);
  provider.addScope('user.read');

  return provider;
}

/**
 * En web se abre un popup. En la app híbrida no hay popup disponible, así que
 * se navega a Microsoft y se devuelve null: la app se recarga y el resultado se
 * recoge después con resolvePendingRedirect().
 */
export async function signIn(useRedirect: boolean): Promise<User | null> {
  if (useRedirect) {
    await signInWithRedirect(firebaseAuth(), microsoftProvider());
    return null;
  }

  const credential = await signInWithPopup(firebaseAuth(), microsoftProvider());
  return credential.user;
}

export async function resolvePendingRedirect(): Promise<User | null> {
  const result = await getRedirectResult(firebaseAuth());
  return result?.user ?? null;
}

export async function signOutUser(): Promise<void> {
  await signOut(firebaseAuth());
}
