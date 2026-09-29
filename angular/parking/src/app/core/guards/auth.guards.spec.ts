import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { type CanMatchFn, provideRouter } from '@angular/router';
import type { UserRole } from '../services/auth/auth.service';
import { FIREBASE_AUTH, type FirebaseAuthGateway } from '../services/auth/firebase-auth';
import { TEST_ACCOUNTS, signInForTest } from '../../testing/test-session';
import { homeFor, redirectToHome, roleGuard } from './auth.guards';

describe('barreras de navegación por rol', () => {
  const setup = (role: UserRole | null) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    signInForTest(role);
  };

  /** La barrera no mira la ruta ni los segmentos: solo el rol de la sesión. */
  const canMatch = (...roles: UserRole[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard(...roles)(...([{}, [], {}] as unknown as Parameters<CanMatchFn>)),
    ) as Promise<boolean>;

  const redirect = async () =>
    String(await TestBed.runInInjectionContext(() => redirectToHome({} as Parameters<typeof redirectToHome>[0])));

  it('cada rol tiene su propio inicio', () => {
    expect(homeFor(TEST_ACCOUNTS.user)).toBe('/inicio');
    expect(homeFor(TEST_ACCOUNTS.admin)).toBe('/admin/resumen');
    expect(homeFor(TEST_ACCOUNTS.security)).toBe('/seguridad/resumen');
    expect(homeFor(null)).toBe('/login');
  });

  it('sin sesión ningún grupo de rutas existe y todo lleva al acceso', async () => {
    setup(null);

    expect(await canMatch('user')).toBe(false);
    expect(await canMatch('admin')).toBe(false);
    expect(await canMatch('security')).toBe(false);
    expect(await redirect()).toBe('/login');
  });

  it('un estudiante solo ve el grupo de usuarios', async () => {
    setup('user');

    expect(await canMatch('user')).toBe(true);
    expect(await canMatch('admin')).toBe(false);
    expect(await canMatch('security')).toBe(false);
    expect(await redirect()).toBe('/inicio');
  });

  it('la administración solo ve su grupo', async () => {
    setup('admin');

    expect(await canMatch('admin')).toBe(true);
    expect(await canMatch('user')).toBe(false);
    expect(await redirect()).toBe('/admin/resumen');
  });

  it('el personal de seguridad solo ve su grupo', async () => {
    setup('security');

    expect(await canMatch('security')).toBe(true);
    expect(await canMatch('user', 'admin')).toBe(false);
    expect(await redirect()).toBe('/seguridad/resumen');
  });

  it('espera a que Firebase diga si hay sesión antes de decidir (al recargar la página)', async () => {
    let answer: ((user: null) => void) | undefined;
    const slowFirebase: Partial<FirebaseAuthGateway> = {
      onAuthStateChanged: async (onUser) => {
        answer = onUser;
        return () => {};
      },
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), { provide: FIREBASE_AUTH, useValue: slowFirebase }],
    });

    let decided = false;
    const decision = canMatch('user').then((allowed) => {
      decided = true;
      return allowed;
    });

    await Promise.resolve();
    expect(decided).toBe(false);

    answer?.(null);
    expect(await decision).toBe(false);
  });
});
