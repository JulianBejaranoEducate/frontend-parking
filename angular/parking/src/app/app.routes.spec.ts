import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import type { UserRole } from './core/services/auth/auth.service';
import { signInForTest } from './testing/test-session';

/**
 * Aislamiento entre dashboards (ADR-010, corrige COR-001): cada rol solo puede
 * abrir sus propias pantallas y cualquier otra dirección lo devuelve a su inicio.
 */
describe('rutas por rol', () => {
  let harness: RouterTestingHarness;

  const as = async (role: UserRole | null) => {
    // provideHttpClient: los dashboards consultan el backend al entrar. En las
    // pruebas no hay backend, así que esas llamadas fallan y cada pantalla
    // muestra su aviso de error; no afecta estas pruebas, que solo verifican a
    // qué pantalla llega cada rol.
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient()],
    });
    signInForTest(role);
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

  it('sin sesión, cualquier pantalla con rol lleva al acceso', async () => {
    await as(null);

    expect(await open('/inicio')).toBe('/login');
    expect(await open('/admin/resumen')).toBe('/login');
    expect(await open('/seguridad/resumen')).toBe('/login');
  });

  it('sin sesión, el formulario de visitantes sí abre', async () => {
    await as(null);

    expect(await open('/visitantes')).toBe('/visitantes');
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
    expect(menuLabels()).not.toContain('Control de acceso');
  });

  it('el personal de seguridad solo ve su dashboard y su menú', async () => {
    await as('security');

    expect(await open('/inicio')).toBe('/seguridad/resumen');
    expect(await open('/admin/incidencias')).toBe('/seguridad/resumen');
    expect(await open('/seguridad/control')).toBe('/seguridad/control');
    expect(menuLabels()).toEqual(['Resumen', 'Control de acceso', 'Novedades']);
    expect(host().querySelector('.sidebar__context')?.textContent?.trim()).toBe('Seguridad');
  });

  it('la raíz lleva a cada quien a su inicio', async () => {
    await as('security');

    expect(await open('/')).toBe('/seguridad/resumen');
  });
});
