import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
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
import { Parking } from './parking';

const owner: BackendVehicle['owner'] = {
  id_user: 'demo-uid',
  name_user: 'Julian Bejarano',
  email_user: 'julian.bejarano@example.edu.co',
  role_id_user: '3',
  status_user: true,
};

const vehicle = (plate: string, type: string): BackendVehicle => ({
  plate,
  brand: 'Yamaha',
  model: 2022,
  color: 'Negro',
  type,
  is_authorized: true,
  owner,
});

const visitor = (id: number, type: string, exitedAt: string | null): BackendVisitor => ({
  id,
  first_name: 'Ana',
  last_name: 'Gómez',
  document_type: 'CC',
  document_number: '1012345678',
  reason: 'Visita académica',
  plate_vehicle_visitor: null,
  brand_vehicle: 'Trek',
  color_vehicle: 'Verde',
  type_vehicle: type,
  model_vehicle: 2021,
  created_at: new Date().toISOString(),
  exited_at: exitedAt,
});

class VehicleApiServiceStub {
  vehicles: BackendVehicle[] = [];
  fail = false;

  inside(): Promise<BackendVehicle[]> {
    return this.fail ? Promise.reject(new Error('sin conexión')) : Promise.resolve(this.vehicles);
  }
}

class VisitorApiServiceStub {
  visitors: BackendVisitor[] = [];

  findAll(): Promise<BackendVisitor[]> {
    return Promise.resolve(this.visitors);
  }
}

const backendUserVehicle = (plate: string, type: string): BackendUserVehicle => ({
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
    vehicles: [],
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
  zonesFail = false;

  zones(): Promise<BackendParkingZone[]> {
    return this.zonesFail ? Promise.reject(new Error('sin conexión')) : Promise.resolve(this.zoneRows);
  }

  zoneByType(vehicleType: string): Promise<BackendParkingZone> {
    const zone = this.zoneRows.find((candidate) => candidate.vehicleType === vehicleType);
    return zone ? Promise.resolve(zone) : Promise.reject(new Error('zona no encontrada'));
  }

  history(_plate: string): Promise<BackendAccessRecord[]> {
    return Promise.resolve([]);
  }

  status(plate: string): Promise<BackendVehicleStatus> {
    return Promise.resolve({ plate, isInside: false, entryDateTime: null, exitDateTime: null });
  }
}

describe('Parking', () => {
  let component: Parking;
  let fixture: ComponentFixture<Parking>;
  let vehicleApi: VehicleApiServiceStub;
  let visitorApi: VisitorApiServiceStub;
  let parkingApi: ParkingApiServiceStub;

  const configure = async () => {
    vehicleApi = new VehicleApiServiceStub();
    visitorApi = new VisitorApiServiceStub();
    parkingApi = new ParkingApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [Parking],
      providers: [
        { provide: VehicleApiService, useValue: vehicleApi },
        { provide: VisitorApiService, useValue: visitorApi },
        { provide: ParkingApiService, useValue: parkingApi },
        { provide: StudentsApiService, useClass: StudentsApiServiceStub },
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
      zones: () => { id: string; occupied: number; capacity: number }[];
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
    expect(zones.find((z) => z.id === 'motos')).toMatchObject({ capacity: 60, occupied: 7 });
    expect(zones.find((z) => z.id === 'bicicletas')).toMatchObject({ capacity: 30, occupied: 3 });
    expect(zones.find((z) => z.id === 'scooters')).toMatchObject({ capacity: 20, occupied: 2 });
    expect(api().totalFree()).toBe(53 + 27 + 18);
    expect(api().totalCapacity()).toBe(60 + 30 + 20);
  });

  it('cuenta por separado los institucionales y los visitantes que siguen dentro', async () => {
    await configure();
    vehicleApi.vehicles = [vehicle('ABC123', 'moto'), vehicle('XYZ987', 'moto')];
    visitorApi.visitors = [visitor(1, 'bicicleta', null), visitor(2, 'scooter', '2026-09-26T10:00:00.000Z')];
    await create();

    expect(api().institutionalInside()).toBe(2);
    // El scooter ya salió (exited_at no es null): no debe contar.
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
    vehicleApi.fail = true;
    await create();

    expect(api().zonesError()).toBeNull();
    expect(host().querySelector('.tile:nth-child(2) .tile__note')?.textContent).toContain(
      'No pudimos consultar',
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
