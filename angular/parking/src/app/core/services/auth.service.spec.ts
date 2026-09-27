import { TestBed } from '@angular/core/testing';
import type { User } from 'firebase/auth';
import { BRAND } from '../config/branding.config';
import {
  FIREBASE_AUTH_STATE_SUBSCRIBER,
  type FirebaseAuthStateListener,
  type FirebaseAuthStateSubscriber,
} from '../auth/firebase-auth-session';
import { AuthService, FIREBASE_CURRENT_USER } from './auth.service';

const getFirebaseCurrentUser = vi.fn<() => Promise<User | null>>();

describe('AuthService Firebase session restoration', () => {
  const unsubscribe = vi.fn();
  const subscribe = vi.fn<FirebaseAuthStateSubscriber>();
  let auth: AuthService;
  let onUser: FirebaseAuthStateListener | undefined;
  let onError: ((error: Error) => void) | undefined;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    getFirebaseCurrentUser.mockReset();
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
    }) as unknown as User;

  it('registra una sola suscripción a los cambios de token', async () => {
    auth = TestBed.inject(AuthService);
    expect(subscribe).toHaveBeenCalledOnce();
    onUser?.(null);

    await auth.waitUntilReady();
    expect(auth.authReady()).toBe(true);
  });

  it('restaura el usuario y sus custom claims', async () => {
    auth = TestBed.inject(AuthService);
    onUser?.(
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
    expect(auth.authReady()).toBe(true);
  });

  it('trata el evento null como una sesión no autenticada', async () => {
    auth = TestBed.inject(AuthService);
    onUser?.(null);

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
    onUser?.(firebaseUser({ role: 'user' }));
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
    onUser?.(firebaseUser({ role: 'user' }, 'person@example.invalid'));

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