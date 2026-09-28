/**
 * Configuración de Firebase.
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
 * Tenant de Azure AD de la universidad.
 */
export const MICROSOFT_TENANT_ID = '470219e7-5ba1-4435-84e0-186963d8e120';

/**
 * Indica si Firebase está configurado.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}