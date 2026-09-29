import { Injectable, computed, inject, signal } from '@angular/core';
import type { User } from 'firebase/auth';
import { BRAND } from '../../config/branding.config';
import { UsersApiService } from '../api/users-api.service';
import { FIREBASE_AUTH } from './firebase-auth';

/**
 * Roles del frontend. El rol decide qué grupo de rutas existe para la persona
 * (ADR-010): cada rol ve solo su propio dashboard. Los visitantes no tienen
 * cuenta: su formulario es público.
 */
export type UserRole = 'admin' | 'user' | 'security';

/**
 * Vínculo de la persona con la universidad, si el token lo trae en sus claims.
 * El personal de seguridad es de una empresa externa.
 */
export type Affiliation = 'estudiante' | 'docente' | 'administrativo' | 'seguridad';

export const AFFILIATION_LABELS: Record<Affiliation, string> = {
  estudiante: 'Estudiante',
  docente: 'Docente',
  administrativo: 'Administrativo',
  seguridad: 'Personal de seguridad',
};

/** Cuenta con la sesión abierta. */
export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  role: UserRole;
  /** Null mientras el token no informe el vínculo. */
  affiliation: Affiliation | null;
  /** Carrera, área o portería, si el token la trae. */
  program: string | null;
}

/** Errores de Firebase traducidos a mensajes que sí puede leer quien usa la app. */
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

/**
 * Rol del claim `rolId` que asigna el backend: 1 userEstandar, 2 vigilante,
 * 3 administrador y 4 superadmin. Sin claim reconocible, la persona entra con
 * los permisos básicos; el backend decide de todas formas qué puede hacer.
 */
const ROLE_BY_ID: Record<number, UserRole> = { 1: 'user', 2: 'security', 3: 'admin', 4: 'admin' };

/** Si Firebase no responde en este tiempo, la app sigue sin sesión en vez de quedarse esperando. */
const AUTH_READY_TIMEOUT_MS = 10_000;

/**
 * Sesión de la app: acceso con Microsoft a través de Firebase.
 *
 * Al abrir la app, Firebase restaura la sesión guardada; hasta que eso termina,
 * `authReady()` es false y los guards esperan con {@link waitUntilReady}. Cada
 * cuenta se registra (o se sincroniza) en el backend con `POST /users`, y el rol
 * sale del claim `rolId` del token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FIREBASE_AUTH);
  private readonly usersApi = inject(UsersApiService);

  private readonly syncedUids = new Set<string>();
  private readonly pendingSyncs = new Map<string, Promise<void>>();
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _authReady = signal(false);
  private resolveAuthReady!: () => void;
  private readonly authReadyPromise = new Promise<void>((resolve) => (this.resolveAuthReady = resolve));
  private authReadyTimeout?: ReturnType<typeof setTimeout>;
  private authFailed = false;
  private authStateRevision = 0;
  private unsubscribeAuth?: () => void;

  /** Cuenta con la sesión abierta; null si no hay sesión. */
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** true cuando Firebase ya dijo si hay sesión o no. */
  readonly authReady = this._authReady.asReadonly();
  /** Rol de la sesión actual; null si no hay sesión. */
  readonly role = computed(() => this._user()?.role ?? null);
  /** uid de quien tiene la sesión, para las llamadas del panel de usuario; vacío sin sesión. */
  readonly effectiveUid = computed(() => this._user()?.uid ?? '');

  constructor() {
    this.authReadyTimeout = setTimeout(
      () => this.failAuth(new Error('Firebase Auth no respondió a tiempo')),
      AUTH_READY_TIMEOUT_MS,
    );
    this.listenToAuthState();
  }

  /** Espera a que Firebase restaure (o descarte) la sesión guardada. */
  waitUntilReady(): Promise<void> {
    return this._authReady() ? Promise.resolve() : this.authReadyPromise;
  }

  /**
   * Inicio de sesión institucional con Microsoft.
   *
   * @returns La cuenta, o null si hubo error o si se lanzó una redirección todavía en curso.
   */
  async loginWithMicrosoft(): Promise<AuthUser | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const account = await this.firebase.signInWithMicrosoft();

      // En el flujo por redirección la app se recarga: aquí todavía no hay usuario.
      return account ? await this.openSession(account) : null;
    } catch (error) {
      this._error.set(this.describe(error));
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Recoge el acceso por redirección al volver de Microsoft (app nativa). La
   * pantalla de acceso la llama al montarse.
   */
  async resumeRedirectSignIn(): Promise<AuthUser | null> {
    try {
      const account = await this.firebase.resolvePendingRedirect();
      return account ? await this.openSession(account) : null;
    } catch (error) {
      this._error.set(this.describe(error));
      return null;
    }
  }

  /**
   * Cierra la sesión. Las pantallas del rol se destruyen al salir de su grupo de
   * rutas (ADR-010), así que en un celular compartido la siguiente persona no ve
   * nada de la cuenta anterior.
   */
  async logout(): Promise<void> {
    await this.firebase.signOut();
    this.syncedUids.clear();
    this._user.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  private async openSession(account: User): Promise<AuthUser> {
    await this.syncWithBackend(account);
    const user = await this.toAuthUser(account);
    this.assertAllowedAccount(user);
    this._user.set(user);
    return user;
  }

  private listenToAuthState(): void {
    void this.firebase.onAuthStateChanged(
      (account) => {
        if (!this.authFailed) {
          void this.onAuthStateChanged(account);
        }
      },
      (error) => this.failAuth(error),
    )
      .then((unsubscribe) => {
        if (this.authFailed) {
          unsubscribe();
          return;
        }

        this.unsubscribeAuth = unsubscribe;
      })
      .catch((error: unknown) => this.failAuth(error));
  }

  private async onAuthStateChanged(account: User | null): Promise<void> {
    const revision = ++this.authStateRevision;

    if (!account) {
      this.syncedUids.clear();
      this._user.set(null);
      this.markAuthReady();
      return;
    }

    try {
      await this.syncWithBackend(account);
      const user = await this.toAuthUser(account);
      this.assertAllowedAccount(user);

      if (revision === this.authStateRevision) {
        this._user.set(user);
        this._error.set(null);
      }
    } catch (error) {
      if (revision === this.authStateRevision) {
        this._user.set(null);
        this._error.set(this.describe(error));
      }
    } finally {
      if (revision === this.authStateRevision) {
        this.markAuthReady();
      }
    }
  }

  /**
   * Registra la cuenta en el backend (`POST /users`) una vez por sesión y
   * renueva el token para que traiga el claim `rolId` que el backend acaba de
   * asignar o sincronizar.
   */
  private async syncWithBackend(account: User): Promise<void> {
    if (this.syncedUids.has(account.uid)) {
      return;
    }

    const pending = this.pendingSyncs.get(account.uid);
    if (pending) {
      return pending;
    }

    const sync = (async () => {
      await this.usersApi.register(this.profileName(account.displayName));

      const current = await this.firebase.currentUser();
      if (!current) {
        throw new Error('La cuenta de Firebase ya no está disponible');
      }

      await current.getIdToken(true);
    })();
    this.pendingSyncs.set(account.uid, sync);

    try {
      await sync;
      this.syncedUids.add(account.uid);
    } finally {
      this.pendingSyncs.delete(account.uid);
    }
  }

  /** El backend exige un nombre de 2 a 100 letras; lo trae la cuenta de Microsoft. */
  private profileName(displayName: string | null): string {
    const name = displayName?.trim() ?? '';
    const length = Array.from(name).length;

    if (length < 2 || length > 100 || !/^\p{L}+(?:[ ]*\p{L}+)*$/u.test(name)) {
      throw new Error('La cuenta de Microsoft no tiene un nombre válido');
    }

    return name;
  }

  private async toAuthUser(account: User): Promise<AuthUser> {
    const { claims } = await account.getIdTokenResult();
    const affiliation = claims['affiliation'];
    const program = claims['program'];

    return {
      uid: account.uid,
      displayName: account.displayName ?? 'Usuario',
      email: account.email ?? '',
      photoUrl: account.photoURL,
      role: ROLE_BY_ID[Number(claims['rolId'])] ?? 'user',
      affiliation: typeof affiliation === 'string' && affiliation in AFFILIATION_LABELS ? (affiliation as Affiliation) : null,
      program: typeof program === 'string' ? program : null,
    };
  }

  private failAuth(error: unknown): void {
    this.authFailed = true;
    this.authStateRevision++;
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = undefined;
    this._user.set(null);
    this._error.set(this.describe(error));
    this.markAuthReady();
  }

  private markAuthReady(): void {
    if (this._authReady()) {
      return;
    }

    clearTimeout(this.authReadyTimeout);
    this._authReady.set(true);
    this.resolveAuthReady();
  }

  /** En la app híbrida no existe el popup: hay que usar redirección. */
  private isNativeShell(): boolean {
    const container = globalThis as { Capacitor?: { isNativePlatform?: () => boolean } };
    return Boolean(container.Capacitor?.isNativePlatform?.());
  }

  /**
   * Barrera temprana de experiencia de uso: la comunidad entra con cuentas del
   * dominio institucional. La validación real vive en el backend, que además lo
   * exige en `POST /users` a todas las cuentas.
   *
   * @throws `{ code: 'auth/invalid-domain' }` si una cuenta que no es de
   * seguridad no pertenece al dominio institucional.
   */
  private assertAllowedAccount(user: AuthUser): void {
    if (user.role !== 'security' && !user.email.toLowerCase().endsWith(`@${BRAND.emailDomain}`)) {
      throw { code: 'auth/invalid-domain' };
    }
  }

  private describe(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';
    return ERROR_MESSAGES[code] ?? 'No pudimos iniciar sesión. Inténtalo de nuevo en unos segundos.';
  }
}
