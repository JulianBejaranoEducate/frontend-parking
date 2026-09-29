import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ParkingApiService } from '../../core/services/api/parking-api.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import { ParkingApiStub, UsersApiStub, accessRecord, testUser, testUserVehicle } from '../../testing/backend-stubs';
import { signInForTest } from '../../testing/test-session';
import { StayHistory } from '../stay-history/stay-history';
import { MainDashboard } from './main-dashboard';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000).toISOString();

/** Cuatro estancias de KZT45F repartidas en 20 días, una en curso. */
const kzt45fHistory = [
  accessRecord(1, 'KZT45F', 'moto', daysAgo(20), daysAgo(19.9)),
  accessRecord(2, 'KZT45F', 'moto', daysAgo(10), daysAgo(9.9)),
  accessRecord(3, 'KZT45F', 'moto', daysAgo(3), daysAgo(2.9)),
  accessRecord(4, 'KZT45F', 'moto', hoursAgo(2), null),
];

describe('MainDashboard', () => {
  let component: MainDashboard;
  let fixture: ComponentFixture<MainDashboard>;
  let usersApi: UsersApiStub;
  let parkingApi: ParkingApiStub;

  const configure = async () => {
    usersApi = new UsersApiStub();
    usersApi.user = testUser([testUserVehicle('KZT45F', 'moto')]);
    parkingApi = new ParkingApiStub();
    parkingApi.historyByPlate = { KZT45F: kzt45fHistory };

    await TestBed.configureTestingModule({
      imports: [MainDashboard],
      providers: [
        provideRouter([]),
        { provide: UsersApiService, useValue: usersApi },
        { provide: ParkingApiService, useValue: parkingApi },
      ],
    }).compileComponents();

    signInForTest('user');
  };

  const create = async () => {
    fixture = TestBed.createComponent(MainDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      greeting: () => string;
      elapsedSince: (date: Date) => string;
      vehiclesLoading: () => boolean;
      vehiclesError: () => string | null;
    };

  /** El historial es un componente aparte (StayHistory), compartido con /estadisticas. */
  const history = () =>
    fixture.debugElement.query(By.directive(StayHistory)).componentInstance as {
      range: () => number;
      setHistoryRange: (days: number) => void;
      filteredStays: () => unknown[];
    };

  const vehicleRows = () => [...host().querySelectorAll('.vehicle')];

  it('should create', async () => {
    await configure();
    await create();

    expect(component).toBeTruthy();
  });

  it('muestra las tarjetas de resumen y las tres secciones del dashboard', async () => {
    await configure();
    await create();

    expect(host().querySelectorAll('.tile').length).toBe(3);
    expect(
      [...host().querySelectorAll('.card__title')].map((t) => t.firstChild?.textContent?.trim()),
    ).toEqual(['Disponibilidad', 'Mis vehículos', 'Historial de entradas y salidas']);
  });

  it('solo pinta el contenido: el header y el menú los pone el layout del rol', async () => {
    await configure();
    await create();

    expect(host().querySelector('app-header')).toBeNull();
    expect(host().querySelector('app-sidebar')).toBeNull();
  });

  // ---- Mis vehículos (backend real, GET /users/:id) -------------------------------

  it('mientras consulta el backend, avisa que está cargando', async () => {
    await configure();
    fixture = TestBed.createComponent(MainDashboard);
    component = fixture.componentInstance;
    // Sin esperar a que resuelva la promesa: el primer render es el de carga.
    fixture.detectChanges();

    expect(host().querySelector('.empty')?.textContent).toContain('Consultando');
  });

  it('si el backend falla, avisa y no inventa vehículos', async () => {
    await configure();
    usersApi.fail = true;
    await create();

    expect(api().vehiclesLoading()).toBe(false);
    expect(api().vehiclesError()).toContain('No pudimos consultar');
    expect(vehicleRows()).toHaveLength(0);
  });

  it('lista los vehículos de verdad, con su estado de aprobación y el cupo usado', async () => {
    await configure();
    usersApi.user = testUser([
      testUserVehicle('KZT45F', 'moto', { is_authorized: true }),
      testUserVehicle('uuid-bici', 'bicicleta', { is_authorized: false, brand: 'Trek', color: 'Verde' }),
    ]);
    await create();

    const statuses = vehicleRows().map((row) => row.querySelector('.chip')?.textContent?.trim());
    expect(statuses).toEqual(['Activo', 'Inactivo']);
    expect(host().querySelector('.card__count')?.textContent?.trim()).toBe('2 de 5');
  });

  it('la placa es el título cuando el backend la asigna de verdad (moto); si no, el tipo de vehículo', async () => {
    await configure();
    usersApi.user = testUser([
      testUserVehicle('KZT45F', 'moto'),
      // El backend genera su propio identificador para lo que no lleva placa real.
      testUserVehicle('5333040a-7100-466c-adcf-a1f581798453', 'scooter'),
    ]);
    await create();

    const titles = vehicleRows().map((row) => row.querySelector('.vehicle__title span')?.textContent?.trim());
    expect(titles).toEqual(['KZT45F', 'Scooter']);
  });

  it('sin vehículos, muestra el estado vacío', async () => {
    await configure();
    usersApi.user = testUser([]);
    await create();

    expect(host().querySelector('.empty')?.textContent).toContain('Todavía no has registrado');
  });

  it('con 5 vehículos reales, agregar queda bloqueado y explica por qué', async () => {
    await configure();
    usersApi.user = testUser([
      testUserVehicle('AAA11A', 'moto'),
      testUserVehicle('BBB22B', 'moto'),
      testUserVehicle('CCC33C', 'moto'),
      testUserVehicle('DDD44D', 'moto'),
      testUserVehicle('EEE55E', 'moto'),
    ]);
    await create();

    const add = host().querySelector('#add-vehicle');
    expect(add?.getAttribute('aria-disabled')).toBe('true');
    expect(add?.getAttribute('aria-describedby')).toBe('vehicles-limit');
    expect(host().querySelector('#vehicles-limit')?.textContent).toContain('máximo de 5');
  });

  // ---- Historial (backend real, GET /parking/historical/:plate) ---------------------

  it('ofrece los cuatro periodos y arranca en 7 días', async () => {
    await configure();
    await create();

    const labels = [...host().querySelectorAll('.range__label')].map((l) => l.textContent?.trim());

    expect(labels).toEqual(['1 día', '7 días', '15 días', '30 días']);
    expect(history().range()).toBe(7);
  });

  it('ampliar el periodo nunca muestra menos estancias', async () => {
    await configure();
    await create();

    const counts: number[] = [];

    for (const days of [1, 7, 15, 30]) {
      history().setHistoryRange(days);
      await fixture.whenStable();
      counts.push(history().filteredStays().length);
    }

    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts[3]).toBeGreaterThan(counts[0]);
  });

  it('la tabla tiene las columnas pedidas y marca la estancia en curso', async () => {
    await configure();
    await create();

    const headers = [...host().querySelectorAll('.data-table th')].map((th) => th.textContent?.trim());

    expect(headers).toEqual(['Fecha', 'Placa', 'Entrada', 'Salida', 'Permanencia']);
    expect(host().querySelector('.data-table .chip--inside')?.textContent?.trim()).toBe('En curso');
  });

  it('si el backend del historial falla, lo avisa y no inventa movimientos', async () => {
    await configure();
    parkingApi.historyFail = true;
    await create();

    expect(
      host().querySelector('#history-title')?.closest('.card')?.querySelector('.empty')?.textContent,
    ).toContain('No pudimos consultar');
  });

  it('el historial solo pide movimientos de los vehículos propios', async () => {
    await configure();
    usersApi.user = testUser([testUserVehicle('KZT45F', 'moto'), testUserVehicle('AAA11A', 'moto')]);
    await create();

    expect(parkingApi.historyCalls.sort()).toEqual(['AAA11A', 'KZT45F']);
  });

  // ---- Disponibilidad (backend real, GET /parkingZone) y utilidades -----------------

  it('la disponibilidad es la misma que ve portería: una fila por tipo de vehículo', async () => {
    await configure();
    await create();

    expect(host().querySelectorAll('app-zone-availability .zone')).toHaveLength(3);
  });

  it('si el backend de zonas falla, lo avisa y no inventa cupos', async () => {
    await configure();
    parkingApi.zonesFail = true;
    await create();

    expect(
      host().querySelector('#zones-title')?.closest('.card')?.querySelector('.empty')?.textContent,
    ).toContain('No pudimos consultar');
  });

  it('resume el tiempo transcurrido en horas y minutos', async () => {
    await configure();
    await create();

    expect(api().elapsedSince(new Date(Date.now() - 96 * 60_000))).toBe('1 h 36 min');
    expect(api().elapsedSince(new Date(Date.now() - 20 * 60_000))).toBe('20 min');
  });

  it('saluda según la hora del día', async () => {
    await configure();
    await create();

    expect(['Buenos días', 'Buenas tardes', 'Buenas noches']).toContain(api().greeting());
  });
});
