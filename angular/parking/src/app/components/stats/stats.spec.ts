import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParkingApiService } from '../../core/services/api/parking-api.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import { ParkingApiStub, UsersApiStub, accessRecord, testUser, testUserVehicle } from '../../testing/backend-stubs';
import { signInForTest } from '../../testing/test-session';
import { Stats } from './stats';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000).toISOString();

describe('Stats', () => {
  let component: Stats;
  let fixture: ComponentFixture<Stats>;
  let usersApi: UsersApiStub;
  let parkingApi: ParkingApiStub;

  const configure = async () => {
    usersApi = new UsersApiStub();
    usersApi.user = testUser([testUserVehicle('KZT45F', 'moto'), testUserVehicle('uuid-bici', 'bicicleta')]);
    parkingApi = new ParkingApiStub();
    parkingApi.historyByPlate = {
      KZT45F: [
        accessRecord(1, 'KZT45F', 'moto', daysAgo(3), daysAgo(2.9)),
        accessRecord(2, 'KZT45F', 'moto', hoursAgo(2), null),
      ],
      'uuid-bici': [accessRecord(3, 'uuid-bici', 'bicicleta', daysAgo(1), daysAgo(0.9))],
    };

    await TestBed.configureTestingModule({
      imports: [Stats],
      providers: [
        { provide: UsersApiService, useValue: usersApi },
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
    usersApi.user.vehicles = [];
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
