import { Injectable, computed, signal } from '@angular/core';
import { BRAND } from '../config/branding.config';

/** Roles del sistema. El rol determina a qué dashboard entra el usuario. */
export type UserRole = 'admin' | 'user' | 'visitor';

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  role: UserRole;
}

/** Errores traducidos a mensajes que sí puede leer el usuario final. */
const ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Cerraste la ventana de Microsoft antes de terminar. Inténtalo de nuevo.',
  'auth/cancelled-popup-request': 'Se canceló el inicio de sesión anterior. Inténtalo de nuevo.',
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Microsoft. Habilita las ventanas emergentes.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta registrada con ese correo.',
  'auth/invalid-domain': `Debes ingresar con tu correo institucional @${BRAND.emailDomain}.`,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  /** Estado expuesto como señales de solo lectura. */
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /**
   * Inicio de sesión institucional con Microsoft (Azure AD) vía Firebase.
   *
   * En web se abre un popup; en la app híbrida el popup no está disponible,
   * así que se usa redirect y el resultado se recoge al volver a cargar la app.
   */
  async loginWithMicrosoft(): Promise<AuthUser | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // ── Integración con Firebase (pendiente de instalar @angular/fire) ──────
      //
      //   const provider = new OAuthProvider('microsoft.com');
      //   provider.setCustomParameters({
      //     // Restringe el login al tenant de la universidad.
      //     tenant: environment.microsoftTenantId,
      //     prompt: 'select_account',
      //     domain_hint: BRAND.emailDomain,
      //   });
      //   provider.addScope('user.read');
      //
      //   const credential = this.isNativePlatform()
      //     ? await signInWithRedirect(this.auth, provider)
      //     : await signInWithPopup(this.auth, provider);
      //
      //   return this.mapFirebaseUser(credential.user);
      //
      // ───────────────────────────────────────────────────────────────────────
      const user = await this.simulateProviderLogin();
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

  /** Acceso de visitantes: no autentica, solo abre el flujo de registro. */
  continueAsVisitor(): void {
    this._error.set(null);
  }

  async logout(): Promise<void> {
    // await signOut(this.auth);
    this._user.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
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

  /** Placeholder mientras se conecta Firebase, para poder probar la pantalla. */
  private simulateProviderLogin(): Promise<AuthUser> {
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
