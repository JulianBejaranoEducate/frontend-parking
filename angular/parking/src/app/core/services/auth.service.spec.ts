import { TestBed } from '@angular/core/testing';
import type { User } from 'firebase/auth';
import { BRAND } from '../config/branding.config';
import {
  FIREBASE_AUTH_STATE_SUBSCRIBER,
  type FirebaseAuthStateListener,
  type FirebaseAuthStateSubscriber,
} from '../auth/firebase-auth-session';
import { AuthService, FIREBASE_CURRENT_USER } from './auth.service';
import { UserProfileService } from './user-profile.service';

const getFirebaseCurrentUser = vi.fn<() => Promise<User | null>>();
const syncCurrentUser = vi.fn<() => Promise<void>>();
let currentFirebaseUser: User | null = null;

describe('AuthService Firebase session restoration', () => {
  const unsubscribe = vi.fn();
  const subscribe = vi.fn<FirebaseAuthStateSubscriber>();
  let auth: AuthService;
  let onUser: FirebaseAuthStateListener | undefined;
  let onError: ((error: Error) => void) | undefined;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    currentFirebaseUser = null;
    getFirebaseCurrentUser.mockReset().mockImplementation(async () => currentFirebaseUser);
    syncCurrentUser.mockReset().mockResolvedValue(undefined);
    onUser = undefined;
    onError = undefined;
    subscribe.mockImplementation(async (userListener, errorListener) => {
      onUser = userListener;
      onError = errorListener;
      return unsubscribe;
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: UserProfileService, useValue: { syncCurrentUser } },
        { provide: FIREBASE_AUTH_STATE_SUBSCRIBER, useValue: subscribe },
        { provide: FIREBASE_CURRENT_USER, useValue: getFirebaseCurrentUser },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  const firebaseUser = (claims: Record<string, unknown>, email = `person@${BRAND.emailDomain}`) =>
    ({
      uid: 'firebase-uid',
      displayName: 'Firebase User',
      email,
      photoURL: null,
      getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    }) as unknown as User & { getIdToken: ReturnType<typeof vi.fn> };

  const emitFirebaseUser = (user: User | null) => {
    currentFirebaseUser = user;
    onUser?.(user);
  };

  it('registra una sola suscripción a los cambios de token', async () => {
    auth = TestBed.inject(AuthService);
    expect(subscribe).toHaveBeenCalledOnce();
    emitFirebaseUser(null);

    await auth.waitUntilReady();
    expect(auth.authReady()).toBe(true);
  });

  it('restaura el usuario y sus custom claims', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(
      firebaseUser({
        role: 'admin',
        affiliation: 'administrativo',
        program: 'Seguridad y parqueaderos',
      }),
    );

    await auth.waitUntilReady();

    expect(auth.user()).toMatchObject({
      uid: 'firebase-uid',
      role: 'admin',
      affiliation: 'administrativo',
      program: 'Seguridad y parqueaderos',
    });
    expect(syncCurrentUser).toHaveBeenCalledOnce();
    expect(auth.authReady()).toBe(true);
  });

  it.each([
    [1, 'user'],
    [2, 'security'],
    [3, 'admin'],
  ] as const)('mapea rolId %i a %s', async (rolId, expectedRole) => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ rolId }));

    await auth.waitUntilReady();

    expect(auth.user()?.role).toBe(expectedRole);
  });

  it('prioriza rolId frente al claim textual role', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ rolId: 2, role: 'admin' }));

    await auth.waitUntilReady();

    expect(auth.user()?.role).toBe('security');
  });

  it('usa user como valor seguro para un rolId desconocido', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ rolId: 99, role: 'admin' }));

    await auth.waitUntilReady();

    expect(auth.user()?.role).toBe('user');
  });

  it('espera la sincronización del perfil antes de completar la restauración', async () => {
    let finishSync!: () => void;
    syncCurrentUser.mockImplementation(() => new Promise<void>((resolve) => (finishSync = resolve)));
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ role: 'user' }));

    await vi.waitFor(() => expect(syncCurrentUser).toHaveBeenCalledOnce());
    expect(auth.user()).toBeNull();
    expect(auth.authReady()).toBe(false);

    finishSync();
    await auth.waitUntilReady();

    expect(auth.user()?.role).toBe('user');
    expect(auth.authReady()).toBe(true);
  });

  it('fuerza el refresh con true después de que el POST termina correctamente', async () => {
    const account = firebaseUser({ role: 'user' });
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(account);

    await auth.waitUntilReady();

    expect(syncCurrentUser).toHaveBeenCalledOnce();
    expect(account.getIdToken).toHaveBeenCalledOnce();
    expect(account.getIdToken).toHaveBeenCalledWith(true);
  });

  it('no publica la sesión hasta completar el refresh forzado', async () => {
    const account = firebaseUser({ role: 'user' });
    let finishRefresh!: (token: string) => void;
    account.getIdToken.mockImplementation(
      () => new Promise<string>((resolve) => (finishRefresh = resolve)),
    );
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(account);

    await vi.waitFor(() => expect(account.getIdToken).toHaveBeenCalledWith(true));
    expect(auth.user()).toBeNull();
    expect(auth.authReady()).toBe(false);

    finishRefresh('refreshed-id-token');
    await auth.waitUntilReady();

    expect(auth.user()?.uid).toBe(account.uid);
    expect(auth.authReady()).toBe(true);
  });

  it('deduplica los flujos de inicio popup/redirect con el evento de sesión Firebase', async () => {
    const account = firebaseUser({ role: 'user' });
    let finishSync!: () => void;
    syncCurrentUser.mockImplementation(() => new Promise<void>((resolve) => (finishSync = resolve)));
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(account);

    const startSignIn = (auth as unknown as {
      toAuthUserAfterProfileSync: (user: User) => Promise<unknown>;
    }).toAuthUserAfterProfileSync(account);
    await vi.waitFor(() => expect(syncCurrentUser).toHaveBeenCalledOnce());
    expect(auth.user()).toBeNull();

    finishSync();
    await expect(startSignIn).resolves.toMatchObject({ uid: account.uid });
    await auth.waitUntilReady();

    expect(syncCurrentUser).toHaveBeenCalledOnce();
    expect(account.getIdToken).toHaveBeenCalledOnce();
    expect(account.getIdToken).toHaveBeenCalledWith(true);
  });

  it('expone el error del POST y permite reintentar porque no lo marca exitoso', async () => {
    const account = firebaseUser({ role: 'user' });
    syncCurrentUser.mockRejectedValueOnce(new Error('Profile synchronization failed'));
    auth = TestBed.inject(AuthService);
    onUser?.(account);

    await auth.waitUntilReady();
    expect(auth.user()).toBeNull();
    expect(auth.error()).toContain('No pudimos iniciar sesión');
    expect(account.getIdToken).not.toHaveBeenCalled();

    emitFirebaseUser(account);
    await vi.waitFor(() => expect(auth.user()?.uid).toBe(account.uid));

    expect(syncCurrentUser).toHaveBeenCalledTimes(2);
  });

  it('maneja como error la ausencia del usuario Firebase después del POST', async () => {
    const account = firebaseUser({ role: 'user' });
    getFirebaseCurrentUser.mockResolvedValue(null);
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(account);

    await auth.waitUntilReady();

    expect(auth.user()).toBeNull();
    expect(auth.error()).toContain('No pudimos iniciar sesión');
    expect(account.getIdToken).not.toHaveBeenCalled();
  });

  it('trata el evento null como una sesión no autenticada', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(null);

    await auth.waitUntilReady();

    expect(auth.user()).toBeNull();
    expect(auth.role()).toBeNull();
  });

  it('devuelve el ID token del usuario autenticado en Firebase', async () => {
    auth = TestBed.inject(AuthService);
    const getIdToken = vi.fn().mockResolvedValue('firebase-id-token');
    getFirebaseCurrentUser.mockResolvedValue({ getIdToken } as unknown as User);

    await expect(auth.getIdToken()).resolves.toBe('firebase-id-token');
    expect(getIdToken).toHaveBeenCalledOnce();
  });

  it('devuelve null si no hay un usuario autenticado en Firebase', async () => {
    auth = TestBed.inject(AuthService);
    getFirebaseCurrentUser.mockResolvedValue(null);

    await expect(auth.getIdToken()).resolves.toBeNull();
  });

  it('devuelve null si Firebase falla al obtener el token y conserva la sesión', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ role: 'user' }));
    await auth.waitUntilReady();
    const session = auth.user();
    const getIdToken = vi.fn().mockRejectedValue(new Error('Token unavailable'));
    getFirebaseCurrentUser.mockResolvedValue({ getIdToken } as unknown as User);

    await expect(auth.getIdToken()).resolves.toBeNull();
    expect(auth.user()).toBe(session);
    expect(auth.error()).toBeNull();
  });

  it('rechaza un usuario restaurado cuyo dominio no está permitido', async () => {
    auth = TestBed.inject(AuthService);
    emitFirebaseUser(firebaseUser({ role: 'user' }, 'person@example.invalid'));

    await auth.waitUntilReady();

    expect(auth.user()).toBeNull();
    expect(auth.error()).toContain(BRAND.emailDomain);
  });

  it('falla cerrado y libera la espera si no llega el primer evento en 10 segundos', async () => {
    vi.useFakeTimers();
    auth = TestBed.inject(AuthService);

    await vi.advanceTimersByTimeAsync(10_000);
    await auth.waitUntilReady();

    expect(auth.authReady()).toBe(true);
    expect(auth.user()).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('falla cerrado ante un error del listener', async () => {
    auth = TestBed.inject(AuthService);
    onError?.(new Error('Firebase listener failed'));

    await auth.waitUntilReady();

    expect(auth.authReady()).toBe(true);
    expect(auth.user()).toBeNull();
    expect(auth.error()).toContain('No pudimos iniciar sesión');
  });
});