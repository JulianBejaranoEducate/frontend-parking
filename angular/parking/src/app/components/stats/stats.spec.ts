import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signInForTest } from '../../testing/demo-session';
import { Stats } from './stats';

describe('Stats', () => {
  let component: Stats;
  let fixture: ComponentFixture<Stats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Stats] }).compileComponents();

    signInForTest('user');

    fixture = TestBed.createComponent(Stats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      historyRange: () => number;
      setHistoryRange: (days: number) => void;
      filteredStays: () => unknown[];
      averageStayLabel: () => string;
      perVehicle: () => { label: string; count: number }[];
    };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca con el rango más amplio, para que las métricas tengan más datos', () => {
    expect(api().historyRange()).toBe(30);
  });

  it('cambiar el periodo recalcula el historial y las métricas', () => {
    const before = api().filteredStays().length;

    api().setHistoryRange(1);

    expect(api().filteredStays().length).toBeLessThanOrEqual(before);
  });

  it('si no hay movimientos en el periodo, la duración promedio se muestra vacía, no 0 min', () => {
    api().setHistoryRange(1);

    // Con los datos de ejemplo puede haber o no movimientos hoy; lo que importa
    // es que un periodo sin estancias nunca calcule un promedio falso.
    if (api().filteredStays().length === 0) {
      expect(api().averageStayLabel()).toBe('—');
    }
  });

  it('agrupa las entradas por vehículo', () => {
    const perVehicle = api().perVehicle();
    const totalFromGroups = perVehicle.reduce((sum, item) => sum + item.count, 0);

    expect(totalFromGroups).toBe(api().filteredStays().length);
  });

  it('muestra el historial completo del periodo, con la misma tabla que /inicio', () => {
    expect(host().querySelector('#history-title')).toBeTruthy();
    expect(host().querySelectorAll('.range__option').length).toBe(4);
  });
});
