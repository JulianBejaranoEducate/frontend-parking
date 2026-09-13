import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, type RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { signInForTest } from '../../testing/demo-session';
import { adminGuard, authGuard } from './auth.guards';

describe('guardas de navegación', () => {
  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  const setup = (profile: 'user' | 'admin' | null) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    signInForTest(profile);
  };

  const target = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

  it('sin sesión, todo vuelve al acceso', () => {
    setup(null);

    expect(target(run(authGuard))).toBe('/login');
    expect(target(run(adminGuard))).toBe('/login');
  });

  it('un estudiante entra a registrar vehículos pero no a la administración', () => {
    setup('user');

    expect(run(authGuard)).toBe(true);
    expect(target(run(adminGuard))).toBe('/inicio');
  });

  it('la administración entra a su dashboard', () => {
    setup('admin');

    expect(run(adminGuard)).toBe(true);
  });
});
