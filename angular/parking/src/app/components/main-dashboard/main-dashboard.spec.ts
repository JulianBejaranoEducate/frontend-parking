import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ParkingService } from '../../core/services/parking.service';
import {
  type BackendStudent,
  type BackendUserVehicle,
  StudentsApiService,
} from '../../core/services/modules/students-student-panel/students-api.sp.service';
import { signInForTest } from '../../testing/demo-session';
import { MainDashboard } from './main-dashboard';

const vehicle = (
  plate: string,
  type: string,
  overrides: Partial<BackendUserVehicle> = {},
): BackendUserVehicle => ({
  plate,
  brand: 'Yamaha',
  model: 2022,
  color: 'Negro',
  type,
  is_authorized: true,
  id_owner: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
  ...overrides,
});

const student = (vehicles: BackendUserVehicle[]): BackendStudent => ({
  id: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
  name: 'test s',
  email: 'test@test.com',
  roleId: '3',
  status_user: true,
  vehicles,
});

class StudentsApiServiceStub {
  student: BackendStudent = student([]);
  fail = false;

  findById(_id: string): Promise<BackendStudent> {
    return this.fail ? Promise.reject(new Error('sin conexión')) : Promise.resolve(this.student);
  }
}

describe('MainDashboard', () => {
  let component: MainDashboard;
  let fixture: ComponentFixture<MainDashboard>;
  let parking: ParkingService;
  let studentsApi: StudentsApiServiceStub;

  const configure = async () => {
    studentsApi = new StudentsApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [MainDashboard],
      providers: [provideRouter([]), { provide: StudentsApiService, useValue: studentsApi }],
    }).compileComponents();

    signInForTest('user');
    parking = TestBed.inject(ParkingService);
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
      historyRange: () => number;
      setHistoryRange: (days: number) => void;
      filteredStays: () => unknown[];
      vehiclesLoading: () => boolean;
      vehiclesError: () => string | null;
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
    studentsApi.fail = true;
    await create();

    expect(api().vehiclesLoading()).toBe(false);
    expect(api().vehiclesError()).toContain('No pudimos consultar');
    expect(vehicleRows()).toHaveLength(0);
  });

  it('lista los vehículos de verdad, con su estado real (dentro/fuera) y el cupo usado', async () => {
    await configure();
    studentsApi.student = student([
      vehicle('KZT45F', 'moto', { is_authorized: true }),
      vehicle('uuid-bici', 'bicicleta', { is_authorized: false, brand: 'Trek', color: 'Verde' }),
    ]);
    await create();

    const statuses = vehicleRows().map((row) => row.querySelector('.chip')?.textContent?.trim());
    expect(statuses).toEqual(['Activo', 'Inactivo']);
    expect(host().querySelector('.card__count')?.textContent?.trim()).toBe('2 de 5');
  });

  it('la placa es el título cuando el backend la asigna de verdad (moto); si no, el tipo de vehículo', async () => {
    await configure();
    studentsApi.student = student([
      vehicle('KZT45F', 'moto'),
      // El backend genera su propio identificador para lo que no lleva placa real.
      vehicle('5333040a-7100-466c-adcf-a1f581798453', 'scooter'),
    ]);
    await create();

    const titles = vehicleRows().map((row) => row.querySelector('.vehicle__title span')?.textContent?.trim());
    expect(titles).toEqual(['KZT45F', 'Scooter']);
  });

  it('sin vehículos, muestra el estado vacío', async () => {
    await configure();
    await create();

    expect(host().querySelector('.empty')?.textContent).toContain('Todavía no has registrado');
  });

  it('con 5 vehículos reales, agregar queda bloqueado y explica por qué', async () => {
    await configure();
    studentsApi.student = student([
      vehicle('AAA11A', 'moto'),
      vehicle('BBB22B', 'moto'),
      vehicle('CCC33C', 'moto'),
      vehicle('DDD44D', 'moto'),
      vehicle('EEE55E', 'moto'),
    ]);
    await create();

    const add = host().querySelector('#add-vehicle');
    expect(add?.getAttribute('aria-disabled')).toBe('true');
    expect(add?.getAttribute('aria-describedby')).toBe('vehicles-limit');
    expect(host().querySelector('#vehicles-limit')?.textContent).toContain('máximo de 5');
  });

  // ---- Historial -------------------------------------------------------------------

  it('ofrece los cuatro periodos y arranca en 7 días', async () => {
    await configure();
    await create();

    const labels = [...host().querySelectorAll('.range__label')].map((l) => l.textContent?.trim());

    expect(labels).toEqual(['1 día', '7 días', '15 días', '30 días']);
    expect(api().historyRange()).toBe(7);
  });

  it('ampliar el periodo nunca muestra menos estancias', async () => {
    await configure();
    await create();

    const counts: number[] = [];

    for (const days of [1, 7, 15, 30]) {
      api().setHistoryRange(days);
      await fixture.whenStable();
      counts.push(api().filteredStays().length);
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

  // ---- Disponibilidad y utilidades ---------------------------------------------------

  it('la disponibilidad es la misma que ve portería: una fila por tipo de vehículo', async () => {
    await configure();
    await create();

    expect(host().querySelectorAll('app-zone-availability .zone')).toHaveLength(3);
  });

  it('el historial solo trae las estancias de quien tiene la sesión', async () => {
    await configure();
    await create();

    const stays = parking.stays();

    expect(stays.length).toBeGreaterThan(0);
    expect(stays.every((stay) => stay.subject.kind === 'institutional' && stay.subject.uid === 'demo-uid')).toBe(true);
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
