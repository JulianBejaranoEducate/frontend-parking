import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ParkingService } from '../../core/services/parking.service';
import { VehicleRegistrationService } from '../../core/services/vehicle-registration.service';
import { signInForTest } from '../../testing/demo-session';
import { MainDashboard } from './main-dashboard';

describe('MainDashboard', () => {
  let component: MainDashboard;
  let fixture: ComponentFixture<MainDashboard>;
  let parking: ParkingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest('user');

    parking = TestBed.inject(ParkingService);
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
      historyRange: () => number;
      setHistoryRange: (days: number) => void;
      filteredStays: () => unknown[];
    };

  const vehicleRows = () => [...host().querySelectorAll('.vehicle')];

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las tarjetas de resumen y las tres secciones del dashboard', () => {
    expect(host().querySelectorAll('.tile').length).toBe(3);
    expect(
      [...host().querySelectorAll('.card__title')].map((t) => t.firstChild?.textContent?.trim()),
    ).toEqual(['Disponibilidad', 'Mis vehículos', 'Historial de entradas y salidas']);
  });

  it('la hamburguesa abre y cierra el menú', () => {
    const before = api().menuOpen();
    api().toggleMenu();

    expect(api().menuOpen()).toBe(!before);
  });

  // ---- Mis vehículos -------------------------------------------------------------

  it('lista los vehículos con su estado de aprobación y el cupo usado', () => {
    const chips = vehicleRows().map((row) => row.querySelector('.chip')?.textContent?.trim());

    expect(chips).toEqual(['Aprobado', 'Pendiente', 'Rechazado']);
    expect(host().querySelector('.card__count')?.textContent?.trim()).toBe('3 de 5');
  });

  it('la placa es el título cuando existe; si no, el tipo de vehículo', () => {
    const titles = vehicleRows().map((row) =>
      row.querySelector('.vehicle__title span')?.textContent?.trim(),
    );

    expect(titles).toEqual(['KZT45F', 'Bicicleta', 'Scooter']);
  });

  it('muestra el motivo cuando la administración rechazó un vehículo', () => {
    expect(vehicleRows()[2].querySelector('.vehicle__note')?.textContent).toContain(
      'El propietario no coincide con la cuenta',
    );
  });

  it('la papelera pide confirmación antes de eliminar', async () => {
    host().querySelector<HTMLButtonElement>('#delete-reg-kzt45f')?.click();
    await fixture.whenStable();

    expect(vehicleRows()).toHaveLength(3);
    expect(host().querySelector('.vehicle__confirm')).toBeTruthy();
  });

  it('cancelar la confirmación deja el vehículo intacto', async () => {
    host().querySelector<HTMLButtonElement>('#delete-reg-kzt45f')?.click();
    await fixture.whenStable();
    host().querySelector<HTMLButtonElement>('#cancel-delete-reg-kzt45f')?.click();
    await fixture.whenStable();

    expect(vehicleRows()).toHaveLength(3);
    expect(host().querySelector('.vehicle__confirm')).toBeNull();
  });

  it('confirmar elimina el vehículo, actualiza el cupo y lo anuncia', async () => {
    host().querySelector<HTMLButtonElement>('#delete-reg-bianchi')?.click();
    await fixture.whenStable();
    host().querySelector<HTMLButtonElement>('.small-btn--danger')?.click();
    await fixture.whenStable();

    expect(vehicleRows()).toHaveLength(2);
    expect(host().querySelector('.card__count')?.textContent?.trim()).toBe('2 de 5');
    expect(host().querySelector('[aria-live="polite"]')?.textContent).toContain('Bicicleta se eliminó');
  });

  it('eliminar un vehículo no borra su historial', async () => {
    const staysBefore = parking.stays().length;

    parking.removeVehicle('reg-kzt45f');
    await fixture.whenStable();

    expect(parking.stays().length).toBe(staysBefore);
  });

  it('con 5 vehículos, agregar queda bloqueado y explica por qué', async () => {
    const registrations = TestBed.inject(VehicleRegistrationService);
    const bike = { owner: { firstName: 'Julian', lastName: 'Bejarano' }, vehicle: { type: 'bicicleta' as const }, documents: [] };
    registrations.submit(bike);
    registrations.submit(bike);
    await fixture.whenStable();

    const add = host().querySelector('#add-vehicle');
    expect(add?.getAttribute('aria-disabled')).toBe('true');
    expect(add?.getAttribute('aria-describedby')).toBe('vehicles-limit');
    expect(host().querySelector('#vehicles-limit')?.textContent).toContain('máximo de 5');
  });

  // ---- Historial -------------------------------------------------------------------

  it('ofrece los cuatro periodos y arranca en 7 días', () => {
    const labels = [...host().querySelectorAll('.range__label')].map((l) => l.textContent?.trim());

    expect(labels).toEqual(['1 día', '7 días', '15 días', '30 días']);
    expect(api().historyRange()).toBe(7);
  });

  it('ampliar el periodo nunca muestra menos estancias', async () => {
    const counts: number[] = [];

    for (const days of [1, 7, 15, 30]) {
      api().setHistoryRange(days);
      await fixture.whenStable();
      counts.push(api().filteredStays().length);
    }

    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts[3]).toBeGreaterThan(counts[0]);
  });

  it('la tabla tiene las columnas pedidas y marca la estancia en curso', () => {
    const headers = [...host().querySelectorAll('.data-table th')].map((th) => th.textContent?.trim());

    expect(headers).toEqual(['Fecha', 'Placa', 'Entrada', 'Salida', 'Permanencia']);
    expect(host().querySelector('.data-table .chip--inside')?.textContent?.trim()).toBe('En curso');
  });

  // ---- Disponibilidad y utilidades ---------------------------------------------------

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

  it('resume el tiempo transcurrido en horas y minutos', () => {
    expect(api().elapsedSince(new Date(Date.now() - 96 * 60_000))).toBe('1 h 36 min');
    expect(api().elapsedSince(new Date(Date.now() - 20 * 60_000))).toBe('20 min');
  });

  it('saluda según la hora del día', () => {
    expect(['Buenos días', 'Buenas tardes', 'Buenas noches']).toContain(api().greeting());
  });
});
