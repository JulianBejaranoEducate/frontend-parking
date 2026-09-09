import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainDashboard } from './main-dashboard';

describe('MainDashboard', () => {
  let component: MainDashboard;
  let fixture: ComponentFixture<MainDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      menuOpen: () => boolean;
      toggleMenu: () => void;
      greeting: () => string;
      elapsedSince: (date: Date) => string;
      status: (zone: any) => string;
      freeSpots: (zone: any) => number;
      occupancyPercent: (zone: any) => number;
    };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las tres tarjetas de resumen y las tres secciones del dashboard', () => {
    expect(host().querySelectorAll('.tile').length).toBe(3);
    expect([...host().querySelectorAll('.card__title')].map((t) => t.textContent?.trim())).toEqual([
      'Mi vehículo',
      'Disponibilidad',
      'Entradas y salidas',
    ]);
  });

  it('la hamburguesa abre y cierra el menú', () => {
    const before = api().menuOpen();
    api().toggleMenu();

    expect(api().menuOpen()).toBe(!before);
  });

  it('clasifica cada zona por ocupación', () => {
    expect(api().status({ id: 'z', name: 'z', accepts: 'moto', capacity: 10, occupied: 3 })).toBe('available');
    expect(api().status({ id: 'z', name: 'z', accepts: 'moto', capacity: 10, occupied: 9 })).toBe('filling');
    expect(api().status({ id: 'z', name: 'z', accepts: 'moto', capacity: 10, occupied: 10 })).toBe('full');
  });

  it('calcula cupos libres y porcentaje de ocupación', () => {
    const zone = { id: 'z', name: 'z', accepts: 'moto' as const, capacity: 60, occupied: 45 };

    expect(api().freeSpots(zone)).toBe(15);
    expect(api().occupancyPercent(zone)).toBe(75);
  });

  it('cada estado de zona se acompaña de una etiqueta, no solo de color', () => {
    const chips = [...host().querySelectorAll('.chip')];

    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.textContent?.trim()).toMatch(/Disponible|Casi lleno|Sin cupos/);
      expect(chip.querySelector('svg')).toBeTruthy();
    }
  });

  it('resume el tiempo transcurrido en horas y minutos', () => {
    expect(api().elapsedSince(new Date(Date.now() - 96 * 60_000))).toBe('1 h 36 min');
    expect(api().elapsedSince(new Date(Date.now() - 20 * 60_000))).toBe('20 min');
  });

  it('saluda según la hora del día', () => {
    expect(['Buenos días', 'Buenas tardes', 'Buenas noches']).toContain(api().greeting());
  });
});
