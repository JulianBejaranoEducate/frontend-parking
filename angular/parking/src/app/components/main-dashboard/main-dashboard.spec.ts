import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signInForTest } from '../../testing/demo-session';
import { MainDashboard } from './main-dashboard';

describe('MainDashboard', () => {
  let component: MainDashboard;
  let fixture: ComponentFixture<MainDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest('user');

    fixture = TestBed.createComponent(MainDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const textOf = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim();
  const texts = (selector: string) => [...host().querySelectorAll(selector)].map(textOf);

  const api = () =>
    component as unknown as {
      greeting: () => string;
      elapsedSince: (date: Date) => string;
      historyRange: () => number;
    };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las tarjetas de resumen y las tres secciones del dashboard', () => {
    expect(host().querySelectorAll('.tile').length).toBe(3);
    expect(
      [...host().querySelectorAll('.card__title')].map((t) => t.firstChild?.textContent?.trim()),
    ).toEqual(['Disponibilidad', 'Mis vehículos', 'Historial de entradas y salidas']);
  });

  it('solo pinta el contenido: el header y el menú los pone el layout del rol', () => {
    expect(host().querySelector('app-header')).toBeNull();
    expect(host().querySelector('app-sidebar')).toBeNull();
  });

  // Todavía no hay backend para la comunidad: cada sección se ve con su estado vacío.

  it('los indicadores arrancan en cero y el vehículo figura afuera', () => {
    expect(texts('.tile__value')).toEqual(['Afuera', '0', '0']);
    expect(textOf(host().querySelector('.tile__note'))).toBe('No hay ningún ingreso activo.');
  });

  it('la disponibilidad no muestra zonas', () => {
    expect(host().querySelectorAll('app-zone-availability .zone')).toHaveLength(0);
  });

  it('Mis vehículos está vacío y permite agregar el primero', () => {
    const add = host().querySelector('#add-vehicle');

    expect(host().querySelectorAll('.vehicle')).toHaveLength(0);
    expect(textOf(host().querySelector('.card__count'))).toBe('0 de 5');
    expect(add?.getAttribute('aria-disabled')).toBe('false');
    expect(host().querySelector('#vehicles-limit')).toBeNull();
  });

  it('agregar vehículo lleva al formulario de registro', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    host().querySelector<HTMLButtonElement>('#add-vehicle')?.click();

    expect(navigate).toHaveBeenCalledWith(['/vehiculos/registrar']);
  });

  it('el historial ofrece los cuatro periodos, arranca en 7 días y no pinta la tabla', () => {
    expect(texts('.range__label')).toEqual(['1 día', '7 días', '15 días', '30 días']);
    expect(api().historyRange()).toBe(7);
    expect(host().querySelector('.data-table')).toBeNull();
  });

  it('cada lista explica que está vacía', () => {
    expect(texts('.empty')).toEqual([
      'Todavía no has registrado ningún vehículo.',
      'No hay movimientos en este periodo.',
    ]);
  });

  it('resume el tiempo transcurrido en horas y minutos', () => {
    expect(api().elapsedSince(new Date(Date.now() - 96 * 60_000))).toBe('1 h 36 min');
    expect(api().elapsedSince(new Date(Date.now() - 20 * 60_000))).toBe('20 min');
  });

  it('saluda según la hora del día, con el primer nombre de la sesión', () => {
    expect(['Buenos días', 'Buenas tardes', 'Buenas noches']).toContain(api().greeting());
    expect(textOf(host().querySelector('.page__title'))).toBe(`${api().greeting()}, Estudiante`);
  });
});
