import { TestBed } from '@angular/core/testing';
import { type CanMatchFn, provideRouter } from '@angular/router';
import { DEMO_ACCOUNTS, type AuthUser, type UserRole, AuthService } from '../services/auth.service';
import { homeFor, redirectToHome, roleGuard } from './auth.guards';

describe('barreras de navegación por rol', () => {
  const setup = (profile: keyof typeof DEMO_ACCOUNTS | null, readiness = Promise.resolve()) => {
    let currentUser: AuthUser | null = profile ? DEMO_ACCOUNTS[profile] : null;
    const auth = {
      user: vi.fn(() => currentUser),
      role: vi.fn(() => currentUser?.role ?? null),
      waitUntilReady: vi.fn(() => readiness),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });

    return {
      auth,
      setUser: (user: AuthUser | null) => {
        currentUser = user;
      },
    };
  };

  /** La barrera no mira la ruta ni los segmentos: solo el rol de la sesión. */
  const canMatch = async (...roles: UserRole[]) =>
    await TestBed.runInInjectionContext(() =>
      roleGuard(...roles)(...([{}, [], {}] as unknown as Parameters<CanMatchFn>)),
    );

  const redirect = async () =>
    String(
      await TestBed.runInInjectionContext(() =>
        redirectToHome({} as Parameters<typeof redirectToHome>[0]),
      ),
    );

  it('cada rol tiene su propio inicio', () => {
    expect(homeFor(DEMO_ACCOUNTS.user)).toBe('/inicio');
    expect(homeFor(DEMO_ACCOUNTS.admin)).toBe('/admin/resumen');
    expect(homeFor(DEMO_ACCOUNTS.security)).toBe('/seguridad/resumen');
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

  it('espera a que termine la restauración antes de consultar el rol', async () => {
    let resolveReady!: () => void;
    const readiness = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const { auth } = setup('admin', readiness);
    const decision = canMatch('admin');

    expect(auth.role).not.toHaveBeenCalled();
    resolveReady();
    expect(await decision).toBe(true);
    expect(auth.role).toHaveBeenCalledOnce();
  });

  it('espera a que termine la restauración antes de redirigir', async () => {
    let resolveReady!: () => void;
    const readiness = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const { auth } = setup('security', readiness);
    const destination = redirect();

    expect(auth.user).not.toHaveBeenCalled();
    resolveReady();
    expect(await destination).toBe('/seguridad/resumen');
    expect(auth.user).toHaveBeenCalledOnce();
  });
});
