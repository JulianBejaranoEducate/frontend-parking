import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signInForTest } from '../../testing/demo-session';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

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

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await open('resumen');
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const texts = (selector: string) =>
    [...host().querySelectorAll(selector)].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('solo pinta la sección: el menú lo pone el layout (ver admin-navigation.spec)', () => {
    expect(host().querySelector('app-sidebar')).toBeNull();
  });

  // Todavía no hay backend para la administración: cada sección se ve con su estado vacío.

  it('el resumen muestra sus indicadores en cero y las dos listas vacías', () => {
    expect(texts('.tiles--4 .tile__value')).toEqual(['0', '0', '0', '0 %']);
    expect(text('.tile__note')).toBe('No hay solicitudes esperando.');
    expect(texts('.empty')).toEqual(['No hay solicitudes pendientes.', 'No hay incidencias abiertas.']);
  });

  it('cada lista de solicitudes muestra su título y su estado vacío', async () => {
    const sections = [
      ['pendientes', 'Solicitudes pendientes'],
      ['aprobados', 'Vehículos aprobados'],
      ['rechazados', 'Solicitudes rechazadas'],
      ['actualizaciones', 'Actualización de documentos'],
    ];

    for (const [section, title] of sections) {
      await open(section);

      expect(text('.page__title')).toBe(title);
      expect(text('.empty')).toBe('No hay solicitudes en esta vista.');
    }
  });

  it('con una búsqueda escrita, el vacío lo explica la búsqueda', async () => {
    await open('pendientes');
    const search = host().querySelector<HTMLInputElement>('.search-field__input')!;

    search.value = 'kzt';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(text('.empty')).toBe('Ninguna solicitud coincide con la búsqueda.');
  });

  it('una solicitud que no existe no abre la revisión', async () => {
    await open('pendientes', 'reg-inexistente');

    expect(host().querySelector('.checklist')).toBeNull();
    expect(text('.page__title')).toBe('Solicitudes pendientes');
  });

  it('las estadísticas arrancan en 14 días, sin columnas y sin inventar hora pico ni permanencia', async () => {
    await open('estadisticas');

    expect(texts('.tiles--4 .tile__value')).toEqual(['0', '0', '—', '—']);
    expect(text('.tile__note')).toBe('En los últimos 14 días.');
    expect(host().querySelectorAll('.chart__column')).toHaveLength(0);
    expect(text('.chart__threshold-label')).toBe('Casi lleno');
  });

  it('las incidencias muestran su estado vacío', async () => {
    await open('incidencias');

    expect(text('.empty')).toBe('No hay incidencias en esta vista.');
  });

  it('una sección desconocida muestra el resumen', async () => {
    await open('no-existe');

    expect(text('.page__title')).toBe('Resumen');
  });
});
