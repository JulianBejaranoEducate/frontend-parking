import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { VehicleRegistrationService } from '../../core/services/vehicle-registration.service';
import { signInForTest } from '../../testing/demo-session';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let registrations: VehicleRegistrationService;

  const open = async (section: string, solicitud?: string) => {
    fixture.componentRef.setInput('section', section);
    fixture.componentRef.setInput('solicitud', solicitud);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest('admin');

    registrations = TestBed.inject(VehicleRegistrationService);
    // Las acciones navegan para cerrar la revisión; en la prueba basta con que no fallen.
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await open('resumen');
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const api = () =>
    component as unknown as {
      checks: { set: (value: Record<string, boolean>) => void };
      checklist: () => { id: string }[];
      approve: () => void;
      chooseDecision: (value: string) => void;
      confirmReject: () => void;
      confirmRequestUpdate: () => void;
      rejectReason: { set: (value: string) => void };
      updateDocument: { set: (value: string) => void };
      decisionNote: { set: (value: string) => void };
      setQuery: (event: Event) => void;
      setTypeFilter: (value: string) => void;
      statsDays: { set: (value: number) => void };
    };

  const checkEverything = () =>
    api().checks.set(Object.fromEntries(api().checklist().map((item) => [item.id, true])));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('solo pinta la sección: el menú con sus contadores lo pone el layout (ver admin-navigation.spec)', () => {
    expect(host().querySelector('app-sidebar')).toBeNull();
  });

  it('el resumen muestra indicadores y la cola de revisión', () => {
    expect(host().querySelectorAll('.tiles--4 .tile')).toHaveLength(4);
    expect(host().querySelectorAll('.requests .request')).toHaveLength(5);
  });

  it('la cola de pendientes va de la más antigua a la más reciente', async () => {
    await open('pendientes');

    const titles = [...host().querySelectorAll('.request__title > span:first-child')].map((t) => t.textContent?.trim());
    expect(titles).toEqual(['Bicicleta', 'JKL45B', 'QWE28F', 'ZXC90A', 'MNB67C']);
  });

  it('señala en la lista las solicitudes cuyo nombre no coincide con la cuenta', async () => {
    await open('pendientes');

    const flagged = [...host().querySelectorAll('.request')]
      .filter((row) => row.textContent?.includes('Nombre no coincide'))
      .map((row) => row.querySelector('.request__title > span')?.textContent?.trim());

    expect(flagged).toEqual(['MNB67C']);
  });

  it('busca por placa y filtra por tipo', async () => {
    await open('pendientes');

    api().setQuery({ target: { value: 'qwe28' } } as unknown as Event);
    await fixture.whenStable();
    expect(host().querySelectorAll('.request')).toHaveLength(1);

    api().setQuery({ target: { value: '' } } as unknown as Event);
    api().setTypeFilter('bicicleta');
    await fixture.whenStable();
    expect(host().querySelectorAll('.request')).toHaveLength(1);
  });

  describe('revisión', () => {
    it('muestra documento, verificación automática y la lista de comparación', async () => {
      await open('pendientes', 'reg-mnb67c');

      expect(host().querySelector('.viewer__image')).toBeTruthy();
      expect(text('.auto-check')).toContain('coinciden solo en parte');
      expect(host().querySelectorAll('.checklist li').length).toBeGreaterThanOrEqual(6);
    });

    it('no aprueba hasta marcar todos los puntos de la comparación', async () => {
      await open('pendientes', 'reg-qwe28f');

      api().approve();
      expect(registrations.find('reg-qwe28f')?.status).toBe('pending');

      checkEverything();
      api().approve();
      expect(registrations.find('reg-qwe28f')?.status).toBe('approved');
    });

    it('rechazar exige un motivo', async () => {
      await open('pendientes', 'reg-jkl45b');

      api().chooseDecision('reject');
      api().confirmReject();
      expect(registrations.find('reg-jkl45b')?.status).toBe('pending');

      api().rejectReason.set('El propietario no coincide con la cuenta');
      api().confirmReject();
      expect(registrations.find('reg-jkl45b')?.status).toBe('rejected');
    });

    it('pedir actualización exige elegir el documento y explicar qué corregir', async () => {
      await open('pendientes', 'reg-zxc90a');

      api().chooseDecision('update');
      api().updateDocument.set('property-card-front');
      api().confirmRequestUpdate();
      expect(registrations.find('reg-zxc90a')?.status).toBe('pending');

      api().decisionNote.set('Sigue con reflejo.');
      api().confirmRequestUpdate();
      expect(registrations.find('reg-zxc90a')?.status).toBe('needs-update');
    });

    it('una solicitud ya resuelta se ve sin acciones, con su historial', async () => {
      await open('rechazados', 'reg-rty19d');

      expect(host().querySelector('.checklist')).toBeNull();
      expect(text('.timeline')).toContain('Rechazada: faltan documentos');
    });
  });

  describe('estadísticas', () => {
    it('dibuja una columna por día y ofrece la tabla equivalente', async () => {
      await open('estadisticas');

      const dailyChart = host().querySelector('[aria-labelledby="chart-daily"]');
      expect(dailyChart?.querySelectorAll('.chart__column')).toHaveLength(14);
      expect(dailyChart?.querySelectorAll('.data-table tbody tr')).toHaveLength(14);

      api().statsDays.set(30);
      await fixture.whenStable();
      expect(dailyChart?.querySelectorAll('.chart__column')).toHaveLength(30);
    });

    it('cada columna se puede leer con teclado y lector de pantalla', async () => {
      await open('estadisticas');

      const column = host().querySelector('.chart__column');
      expect(column?.getAttribute('tabindex')).toBe('0');
      expect(column?.getAttribute('aria-label')).toMatch(/\d+ ingresos$/);
    });

    it('marca el umbral de casi lleno en la ocupación por hora', async () => {
      await open('estadisticas');

      expect(text('.chart__threshold-label')).toBe('Casi lleno');
    });
  });

  it('una incidencia se puede marcar como resuelta', async () => {
    await open('incidencias');
    const before = host().querySelectorAll('.incident').length;

    host().querySelector<HTMLButtonElement>('.incident .small-btn--primary')?.click();
    await fixture.whenStable();

    expect(host().querySelectorAll('.incident')).toHaveLength(before - 1);
  });
});
