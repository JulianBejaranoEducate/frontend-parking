import { provideHttpClient } from '@angular/common/http';
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
    // provideHttpClient: security-dashboard consulta el backend real al entrar
    // (ver loadInside()). Sin sesión real de red, esas llamadas simplemente
    // fallan y el resumen muestra su propio aviso de error; no afecta estas
    // pruebas, que solo verifican a qué pantalla llega cada rol.
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient()],
    });
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
    expect(await open('/seguridad/control')).toBe('/inicio');
    expect(await open('/inicio')).toBe('/inicio');
    expect(menuLabels()).toEqual(['Dashboard', 'Registrar vehículo', 'Vehículos', 'Parqueaderos', 'Estadísticas']);
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
    expect(await open('/seguridad/control')).toBe('/seguridad/control');
    expect(menuLabels()).toEqual(['Resumen', 'Control de acceso']);
    expect(host().querySelector('.sidebar__context')?.textContent?.trim()).toBe('Seguridad');
  });

  it('la raíz lleva a cada quien a su inicio', async () => {
    await as('security-relief');

    expect(await open('/')).toBe('/seguridad/resumen');
  });
});
