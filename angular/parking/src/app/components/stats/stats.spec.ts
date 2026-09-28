import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  type BackendAccessRecord,
  type BackendParkingZone,
  type BackendVehicleStatus,
  ParkingApiService,
} from '../../core/services/modules/parking-student-panel/parking-api.sp.service';
import {
  type BackendStudent,
  type BackendUserVehicle,
  StudentsApiService,
} from '../../core/services/modules/students-student-panel/students-api.sp.service';
import { signInForTest } from '../../testing/demo-session';
import { Stats } from './stats';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000).toISOString();

const record = (
  id: number,
  plate: string,
  zoneType: string,
  entryDateTime: string,
  exitDateTime: string | null,
): BackendAccessRecord => ({ id, plate, visitorId: null, zoneType, entryDateTime, exitDateTime });

const vehicle = (plate: string, type: string): BackendUserVehicle => ({
  plate,
  brand: 'Yamaha',
  model: 2022,
  color: 'Negro',
  type,
  is_authorized: true,
  id_owner: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
});

class StudentsApiServiceStub {
  student: BackendStudent = {
    id: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
    name: 'test s',
    email: 'test@test.com',
    roleId: '3',
    status_user: true,
    vehicles: [vehicle('KZT45F', 'moto'), vehicle('uuid-bici', 'bicicleta')],
  };

  findById(_id: string): Promise<BackendStudent> {
    return Promise.resolve(this.student);
  }
}

/** No extiende ParkingApiService (que inyecta HttpClient) para no tener que proveerlo. */
class ParkingApiServiceStub {
  zoneRows: BackendParkingZone[] = [
    { id: 1, vehicleType: 'moto', totalCapacity: 60, availableSpaces: 53 },
    { id: 2, vehicleType: 'bicicleta', totalCapacity: 30, availableSpaces: 27 },
    { id: 3, vehicleType: 'scooter', totalCapacity: 20, availableSpaces: 18 },
  ];
  historyByPlate: Record<string, BackendAccessRecord[]> = {
    KZT45F: [
      record(1, 'KZT45F', 'moto', daysAgo(3), daysAgo(2.9)),
      record(2, 'KZT45F', 'moto', hoursAgo(2), null),
    ],
    'uuid-bici': [record(3, 'uuid-bici', 'bicicleta', daysAgo(1), daysAgo(0.9))],
  };
  historyFail = false;

  zones(): Promise<BackendParkingZone[]> {
    return Promise.resolve(this.zoneRows);
  }

  zoneByType(vehicleType: string): Promise<BackendParkingZone> {
    const zone = this.zoneRows.find((candidate) => candidate.vehicleType === vehicleType);
    return zone ? Promise.resolve(zone) : Promise.reject(new Error('zona no encontrada'));
  }

  history(plate: string): Promise<BackendAccessRecord[]> {
    return this.historyFail ? Promise.reject(new Error('sin conexión')) : Promise.resolve(this.historyByPlate[plate] ?? []);
  }

  status(plate: string): Promise<BackendVehicleStatus> {
    return Promise.resolve({ plate, isInside: false, entryDateTime: null, exitDateTime: null });
  }
}

describe('Stats', () => {
  let component: Stats;
  let fixture: ComponentFixture<Stats>;
  let studentsApi: StudentsApiServiceStub;
  let parkingApi: ParkingApiServiceStub;

  const configure = async () => {
    studentsApi = new StudentsApiServiceStub();
    parkingApi = new ParkingApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [Stats],
      providers: [
        { provide: StudentsApiService, useValue: studentsApi },
        { provide: ParkingApiService, useValue: parkingApi },
      ],
    }).compileComponents();

    signInForTest('user');
  };

  const create = async () => {
    fixture = TestBed.createComponent(Stats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      loading: () => boolean;
      error: () => string | null;
      historyRange: () => number;
      setHistoryRange: (days: number) => void;
      filteredStays: () => unknown[];
      averageStayLabel: () => string;
      perVehicle: () => { label: string; count: number }[];
    };

  it('should create', async () => {
    await configure();
    await create();

    expect(component).toBeTruthy();
  });

  it('mientras consulta el backend, avisa que está cargando', async () => {
    await configure();
    fixture = TestBed.createComponent(Stats);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(host().querySelector('.empty')?.textContent).toContain('Consultando');
  });

  it('si el backend falla, lo avisa y no inventa movimientos', async () => {
    await configure();
    parkingApi.historyFail = true;
    await create();

    expect(api().loading()).toBe(false);
    expect(api().error()).toContain('No pudimos consultar');
    expect(host().querySelector('.empty')?.textContent).toContain('No pudimos consultar');
  });

  it('arranca con el rango más amplio, para que las métricas tengan más datos', async () => {
    await configure();
    await create();

    expect(api().historyRange()).toBe(30);
  });

  it('cambiar el periodo recalcula el historial y las métricas', async () => {
    await configure();
    await create();

    const before = api().filteredStays().length;

    api().setHistoryRange(1);
    await fixture.whenStable();

    expect(api().filteredStays().length).toBeLessThanOrEqual(before);
  });

  it('si no hay movimientos en el periodo, la duración promedio se muestra vacía, no 0 min', async () => {
    await configure();
    studentsApi.student.vehicles = [];
    await create();

    expect(api().filteredStays()).toHaveLength(0);
    expect(api().averageStayLabel()).toBe('—');
  });

  it('agrupa las entradas por vehículo, de más a menos', async () => {
    await configure();
    await create();

    const perVehicle = api().perVehicle();
    const totalFromGroups = perVehicle.reduce((sum, item) => sum + item.count, 0);

    expect(totalFromGroups).toBe(api().filteredStays().length);
    expect(perVehicle.find((item) => item.label === 'KZT45F')?.count).toBe(2);
    expect(perVehicle.find((item) => item.label === 'Bicicleta')?.count).toBe(1);
  });

  it('muestra el historial completo del periodo, con la misma tabla que /inicio', async () => {
    await configure();
    await create();

    expect(host().querySelector('#history-title')).toBeTruthy();
    expect(host().querySelectorAll('.range__option').length).toBe(4);
    expect(host().querySelector('.data-table .chip--inside')?.textContent?.trim()).toBe('En curso');
  });
});
