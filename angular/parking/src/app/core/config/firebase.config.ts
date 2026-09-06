/**
 * Configuración de Firebase.
 *
 * Estos valores NO son secretos: la consola de Firebase los publica en el
 * cliente a propósito y la seguridad real vive en las reglas de Firestore y en
 * la lista de dominios autorizados del proyecto. Aun así, cámbialos por los del
 * proyecto real antes de desplegar.
 *
 * Cópialos de: consola de Firebase -> Configuración del proyecto -> Tus apps.
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

/**
 * Tenant de Azure AD de la universidad. Al fijarlo, Microsoft solo deja entrar
 * a cuentas de ese directorio; si queda vacío, aceptaría cualquier cuenta
 * Microsoft y la única barrera sería la validación de dominio del correo.
 */
export const MICROSOFT_TENANT_ID = '';

/**
 * Mientras falten las credenciales, la aplicación usa un inicio de sesión
 * simulado para poder revisar las pantallas sin bloquear el diseño.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}
