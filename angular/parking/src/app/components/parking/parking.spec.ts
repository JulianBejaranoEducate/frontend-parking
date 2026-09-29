import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParkingApiService } from '../../core/services/api/parking-api.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import { ParkingApiStub, UsersApiStub, accessRecord } from '../../testing/backend-stubs';
import { signInForTest } from '../../testing/test-session';
import { Parking } from './parking';

describe('Parking', () => {
  let component: Parking;
  let fixture: ComponentFixture<Parking>;
  let parkingApi: ParkingApiStub;

  const configure = async () => {
    parkingApi = new ParkingApiStub();

    await TestBed.configureTestingModule({
      imports: [Parking],
      providers: [
        { provide: ParkingApiService, useValue: parkingApi },
        { provide: UsersApiService, useClass: UsersApiStub },
      ],
    }).compileComponents();

    signInForTest('user');
  };

  const create = async () => {
    fixture = TestBed.createComponent(Parking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      zonesLoading: () => boolean;
      zonesError: () => string | null;
      zones: () => { accepts: string; occupied: number; capacity: number }[];
      totalFree: () => number;
      totalCapacity: () => number;
      institutionalInside: () => number;
      visitorsInside: () => number;
      refreshZones: () => void;
    };

  it('should create', async () => {
    await configure();
    await create();

    expect(component).toBeTruthy();
  });

  it('la capacidad y disponibilidad por zona son las reales del backend (GET /parkingZone)', async () => {
    await configure();
    await create();

    const zones = api().zones();
    expect(zones.find((z) => z.accepts === 'moto')).toMatchObject({ capacity: 60, occupied: 7 });
    expect(zones.find((z) => z.accepts === 'bicicleta')).toMatchObject({ capacity: 30, occupied: 3 });
    expect(zones.find((z) => z.accepts === 'scooter')).toMatchObject({ capacity: 20, occupied: 2 });
    expect(api().totalFree()).toBe(53 + 27 + 18);
    expect(api().totalCapacity()).toBe(60 + 30 + 20);
  });

  it('cuenta por separado los de la comunidad y los visitantes que siguen dentro', async () => {
    await configure();
    const now = new Date().toISOString();
    parkingApi.openRecordRows = [
      accessRecord(1, 'ABC12D', 'moto', now, null),
      accessRecord(2, 'XYZ98K', 'moto', now, null),
      { ...accessRecord(3, 'VIS11A', 'moto', now, null), visitorId: 7 },
    ];
    await create();

    expect(api().institutionalInside()).toBe(2);
    expect(api().visitorsInside()).toBe(1);
  });

  it('si el backend de zonas falla, avisa y no muestra cupos inventados', async () => {
    await configure();
    parkingApi.zonesFail = true;
    await create();

    expect(api().zonesLoading()).toBe(false);
    expect(api().zonesError()).toContain('No pudimos consultar');
  });

  it('si no se puede consultar quién está dentro, lo avisa aparte, sin bloquear las zonas', async () => {
    await configure();
    parkingApi.openRecordsFail = true;
    await create();

    expect(api().zonesError()).toBeNull();
    expect(host().querySelector('.tile:nth-child(2) .tile__note')?.textContent).toContain(
      'No pudimos consultar quién está dentro',
    );
  });

  it('el botón "Actualizar" vuelve a consultar las zonas', async () => {
    await configure();
    await create();

    parkingApi.zoneRows = [{ id: 1, vehicleType: 'moto', totalCapacity: 60, availableSpaces: 10 }];
    api().refreshZones();
    await fixture.whenStable();

    expect(api().zones()).toHaveLength(1);
  });

  it('muestra el aviso de disponibilidad compartido con /inicio (HU-16)', async () => {
    await configure();
    await create();

    expect(host().querySelector('.zones__disclaimer')?.textContent).toContain('no garantiza un cupo reservado');
  });
});
