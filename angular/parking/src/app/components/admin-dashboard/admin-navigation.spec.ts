import { TestBed } from '@angular/core/testing';
import { signInForTest } from '../../testing/demo-session';
import { adminNavigation } from './admin-navigation';

describe('menú de administración', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    signInForTest('admin');
  });

  it('solo cuenta lo que espera a la administración', () => {
    const navigation = TestBed.runInInjectionContext(() => adminNavigation());
    const badges = navigation
      .items()
      .filter((item) => item.badge)
      .map((item) => `${item.label}:${item.badge}`);

    expect(navigation.context).toBe('Administración');
    expect(badges).toEqual(['Pendientes:5', 'Incidencias:3']);
  });
});
