/**
 * Configuración web de Firebase (proyecto compartido con el backend).
 *
 * Estos valores no son secretos: Firebase los publica en el cliente a propósito,
 * y la seguridad real vive en el backend (token con rol y permisos) y en los
 * dominios autorizados del proyecto.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCFB-N_V_UapsmVo7EUgcDxzL8Co4Zbq3Y',
  authDomain: 'parking-48614.firebaseapp.com',
  projectId: 'parking-48614',
  storageBucket: 'parking-48614.firebasestorage.app',
  messagingSenderId: '206293644758',
  appId: '1:206293644758:web:dcad44be2621128044a077',
};

/**
 * Tenant de Azure AD de la universidad: con él, Microsoft solo deja entrar a
 * cuentas de ese directorio. Es un identificador público, no una credencial.
 */
export const MICROSOFT_TENANT_ID = '470219e7-5ba1-4435-84e0-186963d8e120';
