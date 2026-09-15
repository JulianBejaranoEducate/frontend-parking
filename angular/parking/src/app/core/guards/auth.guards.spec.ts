import { TestBed } from '@angular/core/testing';
import { type CanMatchFn, provideRouter } from '@angular/router';
import { DEMO_ACCOUNTS, type DemoProfile, type UserRole } from '../services/auth.service';
import { signInForTest } from '../../testing/demo-session';
import { homeFor, redirectToHome, roleGuard } from './auth.guards';

describe('barreras de navegación por rol', () => {
  const setup = (profile: DemoProfile | null) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    signInForTest(profile);
  };

  /** La barrera no mira la ruta ni los segmentos: solo el rol de la sesión. */
  const canMatch = (...roles: UserRole[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard(...roles)(...([{}, [], {}] as unknown as Parameters<CanMatchFn>)),
    );

  const redirect = () =>
    TestBed.runInInjectionContext(() => String(redirectToHome({} as Parameters<typeof redirectToHome>[0])));

  it('cada rol tiene su propio inicio', () => {
    expect(homeFor(DEMO_ACCOUNTS.user)).toBe('/inicio');
    expect(homeFor(DEMO_ACCOUNTS.admin)).toBe('/admin/resumen');
    expect(homeFor(DEMO_ACCOUNTS.security)).toBe('/seguridad/resumen');
    expect(homeFor(null)).toBe('/login');
  });

  it('sin sesión ningún grupo de rutas existe y todo lleva al acceso', () => {
    setup(null);

    expect(canMatch('user')).toBe(false);
    expect(canMatch('admin')).toBe(false);
    expect(canMatch('security')).toBe(false);
    expect(redirect()).toBe('/login');
  });

  it('un estudiante solo ve el grupo de usuarios', () => {
    setup('user');

    expect(canMatch('user')).toBe(true);
    expect(canMatch('admin')).toBe(false);
    expect(canMatch('security')).toBe(false);
    expect(redirect()).toBe('/inicio');
  });

  it('la administración solo ve su grupo', () => {
    setup('admin');

    expect(canMatch('admin')).toBe(true);
    expect(canMatch('user')).toBe(false);
    expect(redirect()).toBe('/admin/resumen');
  });

  it('el personal de seguridad solo ve su grupo', () => {
    setup('security');

    expect(canMatch('security')).toBe(true);
    expect(canMatch('user', 'admin')).toBe(false);
    expect(redirect()).toBe('/seguridad/resumen');
  });
});
