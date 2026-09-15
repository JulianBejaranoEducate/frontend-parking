import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import type { DemoProfile } from './core/services/auth.service';
import { signInForTest } from './testing/demo-session';

/**
 * Aislamiento entre dashboards (ADR-010, corrige COR-001): cada rol solo puede
 * abrir sus propias pantallas y cualquier otra dirección lo devuelve a su inicio.
 */
describe('rutas por rol', () => {
  let harness: RouterTestingHarness;

  const as = async (profile: DemoProfile | null) => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes, withComponentInputBinding())] });
    signInForTest(profile);
    harness = await RouterTestingHarness.create();
  };

  /** Navega y devuelve la dirección en la que terminó, después de las redirecciones. */
  const open = async (url: string) => {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return TestBed.inject(Router).url;
  };

  const host = () => harness.fixture.nativeElement as HTMLElement;
  const menuLabels = () => [...host().querySelectorAll('.menu__label')].map((item) => item.textContent?.trim());

  it('sin sesión, el inicio de usuarios lleva al acceso (antes se veía el historial de prueba)', async () => {
    await as(null);

    expect(await open('/inicio')).toBe('/login');
    expect(await open('/admin/resumen')).toBe('/login');
    expect(await open('/seguridad/resumen')).toBe('/login');
  });

  it('un estudiante no puede abrir administración ni seguridad', async () => {
    await as('user');

    expect(await open('/admin/pendientes')).toBe('/inicio');
    expect(await open('/seguridad/turno')).toBe('/inicio');
    expect(await open('/inicio')).toBe('/inicio');
    expect(menuLabels()).toEqual(['Registrar vehículo', 'Parqueaderos', 'Estadísticas']);
  });

  it('la administración no puede abrir el dashboard de usuarios ni el de seguridad', async () => {
    await as('admin');

    expect(await open('/inicio')).toBe('/admin/resumen');
    expect(await open('/vehiculos/registrar')).toBe('/admin/resumen');
    expect(await open('/seguridad/resumen')).toBe('/admin/resumen');
    expect(menuLabels()).toContain('Pendientes');
    expect(menuLabels()).not.toContain('Turno');
  });

  it('el personal de seguridad solo ve su dashboard y su menú', async () => {
    await as('security');

    expect(await open('/inicio')).toBe('/seguridad/resumen');
    expect(await open('/admin/incidencias')).toBe('/seguridad/resumen');
    expect(await open('/seguridad/turno')).toBe('/seguridad/turno');
    expect(menuLabels()).toEqual(['Resumen', 'Control de acceso', 'Vehículos dentro', 'Movimientos', 'Turno']);
    expect(host().querySelector('.sidebar__context')?.textContent?.trim()).toBe('Seguridad');
  });

  it('la raíz lleva a cada quien a su inicio', async () => {
    await as('security-relief');

    expect(await open('/')).toBe('/seguridad/resumen');
  });

  describe('control de acceso desde otras pantallas', () => {
    // Hora fija: sin ella, un ingreso de hace 96 minutos sería «de ayer» si la prueba corre de madrugada.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-15T10:00:00'));
    });

    afterEach(() => vi.useRealTimers());

    const settle = () => harness.fixture.whenStable();

    it('el buscador del header lleva al control de acceso con la búsqueda hecha', async () => {
      await as('security');
      await open('/seguridad/resumen');

      const input = host().querySelector<HTMLInputElement>('.topbar__center .search__input')!;
      expect(input.placeholder).toBe('Buscar placa, documento o nombre');

      input.value = 'KZT45F';
      host().querySelector('.topbar__center form')!.dispatchEvent(new Event('submit'));
      await settle();

      expect(TestBed.inject(Router).url).toBe('/seguridad/control?buscar=KZT45F');
      expect(host().querySelector<HTMLInputElement>('#access-search')?.value).toBe('KZT45F');
      expect(host().querySelector('.candidate__title')?.textContent).toContain('KZT45F');
    });

    it('«Registrar salida» en Vehículos dentro abre la tarjeta y, al registrar, limpia la dirección', async () => {
      await as('security');
      await open('/seguridad/dentro');

      host().querySelector<HTMLAnchorElement>('a[aria-label^="Registrar salida de KZT45F"]')!.click();
      await settle();

      expect(TestBed.inject(Router).url).toBe('/seguridad/control?estancia=s-01');
      expect(host().querySelector('.result__direction')?.textContent).toContain('Salida');

      [...host().querySelectorAll<HTMLButtonElement>('.result__actions button')]
        .find((button) => button.textContent?.includes('Registrar salida'))!
        .click();
      await settle();

      expect(TestBed.inject(Router).url).toBe('/seguridad/control');
      expect(host().querySelector('.record')?.textContent).toContain('Salida registrada');
      expect(host().querySelector('app-access-result')).toBeNull();
    });
  });
});
