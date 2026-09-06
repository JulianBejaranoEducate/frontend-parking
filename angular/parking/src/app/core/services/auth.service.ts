import { Injectable, computed, signal } from '@angular/core';
import { BRAND } from '../config/branding.config';
import { isFirebaseConfigured } from '../config/firebase.config';

/** Roles del sistema. El rol determina a qué dashboard entra el usuario. */
export type UserRole = 'admin' | 'user' | 'visitor';

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  role: UserRole;
}

/** Errores de Firebase traducidos a mensajes que sí puede leer el usuario final. */
const ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Cerraste la ventana de Microsoft antes de terminar. Inténtalo de nuevo.',
  'auth/cancelled-popup-request': 'Se canceló el inicio de sesión anterior. Inténtalo de nuevo.',
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Microsoft. Habilita las ventanas emergentes.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta registrada con ese correo.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase. Avisa al administrador.',
  'auth/operation-not-allowed': 'El acceso con Microsoft no está habilitado en Firebase.',
  'auth/invalid-domain': `Debes ingresar con tu correo institucional @${BRAND.emailDomain}.`,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /**
   * Inicio de sesión institucional con Microsoft (Azure AD) a través de Firebase.
   * Devuelve null si hubo error o si se lanzó una redirección todavía en curso.
   */
  async loginWithMicrosoft(): Promise<AuthUser | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const user = isFirebaseConfigured() ? await this.signInWithFirebase() : await this.signInSimulated();

      // En el flujo por redirección la app se recarga: aquí todavía no hay usuario.
      if (!user) {
        return null;
      }

      this.assertInstitutionalDomain(user.email);
      this._user.set(user);

      return user;
    } catch (error) {
      this._error.set(this.describe(error));
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Recoge el resultado del login por redirección al volver de Microsoft.
   * La pantalla de acceso la llama al montarse.
   */
  async resumeRedirectSignIn(): Promise<AuthUser | null> {
    if (!isFirebaseConfigured()) {
      return null;
    }

    try {
      const { resolvePendingRedirect } = await import('./microsoft-auth');
      const account = await resolvePendingRedirect();

      if (!account) {
        return null;
      }

      const user = await this.toAuthUser(account);
      this.assertInstitutionalDomain(user.email);
      this._user.set(user);

      return user;
    } catch (error) {
      this._error.set(this.describe(error));
      return null;
    }
  }

  /** Acceso de visitantes: no autentica, solo abre el flujo de registro. */
  continueAsVisitor(): void {
    this._error.set(null);
  }

  async logout(): Promise<void> {
    if (isFirebaseConfigured()) {
      const { signOutUser } = await import('./microsoft-auth');
      await signOutUser();
    }

    this._user.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  /**
   * firebase/auth se carga aquí, no al abrir la pantalla: son cientos de
   * kilobytes que solo hacen falta cuando alguien pulsa el botón.
   */
  private async signInWithFirebase(): Promise<AuthUser | null> {
    const { signIn } = await import('./microsoft-auth');
    const account = await signIn(this.isNativeShell());

    return account ? this.toAuthUser(account) : null;
  }

  /**
   * El rol llega en los custom claims que el backend asigna a cada cuenta.
   * Sin claim, la persona entra con los permisos básicos.
   */
  private async toAuthUser(account: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
  }): Promise<AuthUser> {
    const token = await account.getIdTokenResult();
    const claimedRole = token.claims['role'];

    return {
      uid: account.uid,
      displayName: account.displayName ?? 'Usuario',
      email: account.email ?? '',
      photoUrl: account.photoURL,
      role: claimedRole === 'admin' || claimedRole === 'visitor' ? claimedRole : 'user',
    };
  }

  /** En la app híbrida no existe el popup: hay que usar redirección. */
  private isNativeShell(): boolean {
    const container = globalThis as {
      Capacitor?: { isNativePlatform?: () => boolean };
      cordova?: unknown;
    };

    return Boolean(container.Capacitor?.isNativePlatform?.() ?? container.cordova);
  }

  /**
   * Solo se permiten cuentas del dominio institucional. La validación real vive
   * en el backend / reglas de Firebase; aquí es una barrera temprana de UX.
   */
  private assertInstitutionalDomain(email: string): void {
    if (!email.toLowerCase().endsWith(`@${BRAND.emailDomain}`)) {
      throw { code: 'auth/invalid-domain' };
    }
  }

  private describe(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';
    return ERROR_MESSAGES[code] ?? 'No pudimos iniciar sesión. Inténtalo de nuevo en unos segundos.';
  }

  /** Sustituto mientras firebase.config.ts no tenga credenciales reales. */
  private signInSimulated(): Promise<AuthUser> {
    console.warn('[AuthService] Firebase sin configurar: usando un inicio de sesión simulado.');

    return new Promise((resolve) => {
      setTimeout(
        () =>
          resolve({
            uid: 'demo-uid',
            displayName: 'Usuario de prueba',
            email: `demo@${BRAND.emailDomain}`,
            photoUrl: null,
            role: 'user',
          }),
        1200,
      );
    });
  }
}
