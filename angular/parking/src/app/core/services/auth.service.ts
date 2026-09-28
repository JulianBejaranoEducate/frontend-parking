import { Injectable, computed, signal } from '@angular/core';

/**
 * Roles del sistema. El rol decide qué grupo de rutas existe para la persona
 * (ADR-010): cada rol ve solo su propio dashboard. Los visitantes no tienen
 * cuenta: su formulario es público.
 */
export type UserRole = 'admin' | 'user' | 'security';

/**
 * Vínculo de la persona con la universidad. El personal de seguridad es de una
 * empresa externa: su vínculo lo asigna la administración al crear la cuenta.
 */
export type Affiliation = 'estudiante' | 'docente' | 'administrativo' | 'seguridad';

/** Cómo se muestra cada vínculo en pantalla. */
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
  /** Vacío en las cuentas de guardias, que no tienen correo institucional (ADR-009). */
  email: string;
  photoUrl: string | null;
  role: UserRole;
  affiliation: Affiliation | null;
  /** Carrera, área o, para el personal de seguridad, la portería. */
  program: string | null;
}

/** Cuentas simuladas del personal de seguridad: por ahora, el único acceso de la app. */
export type DemoProfile = 'security' | 'security-relief';

/** Los dos guardias simulados; sus datos son ficticios. */
export const DEMO_ACCOUNTS: Record<DemoProfile, AuthUser> = {
  security: {
    uid: 'demo-guard-carlos',
    displayName: 'Carlos Ramírez',
    email: '',
    photoUrl: null,
    role: 'security',
    affiliation: 'seguridad',
    program: 'Portería principal',
  },
  'security-relief': {
    uid: 'demo-guard-diana',
    displayName: 'Diana Morales',
    email: '',
    photoUrl: null,
    role: 'security',
    affiliation: 'seguridad',
    program: 'Portería principal',
  },
};

/** La sesión se guarda en la pestaña: recargar no obliga a entrar de nuevo. */
const SESSION_KEY = 'uniparking.session';

/** La sesión guardada en la pestaña, o null si no hay (o no se puede leer). */
function loadSession(): AuthUser | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    // Algunos WebView y el modo privado de Safari lanzan al acceder al almacenamiento.
    return null;
  }
}

/** Guarda la sesión en la pestaña; con null la borra. */
function saveSession(user: AuthUser | null): void {
  try {
    if (user) {
      globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      globalThis.sessionStorage?.removeItem(SESSION_KEY);
    }
  } catch {
    // Sin almacenamiento, la sesión vive solo mientras la pestaña esté abierta.
  }
}

/**
 * Sesión de la app. Por ahora solo existe el acceso simulado del personal de
 * seguridad (Guardia Carlos y Guardia Diana): el inicio de sesión de la
 * comunidad y de la administración llega con el backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(loadSession());

  /** Cuenta con la sesión abierta; null si no hay sesión. */
  readonly user = this._user.asReadonly();
  /** Rol de la sesión actual; null si no hay sesión. */
  readonly role = computed(() => this._user()?.role ?? null);

  /**
   * Entra con una cuenta simulada del personal de seguridad.
   *
   * @param profile Guardia con el que se entra.
   * @returns La cuenta con la sesión abierta.
   */
  loginAsDemo(profile: DemoProfile): AuthUser {
    const user = DEMO_ACCOUNTS[profile];
    this.setUser(user);
    return user;
  }

  /**
   * Cierra la sesión. Las pantallas del rol se destruyen al salir de su grupo
   * de rutas (ADR-010), así que en un celular compartido la siguiente persona
   * no ve nada de la cuenta anterior.
   */
  logout(): void {
    this.setUser(null);
  }

  /** Cambia la sesión en memoria y en la pestaña a la vez. */
  private setUser(user: AuthUser | null): void {
    this._user.set(user);
    saveSession(user);
  }
}
