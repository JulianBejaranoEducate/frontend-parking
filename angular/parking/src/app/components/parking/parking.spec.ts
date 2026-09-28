import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
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

describe('Parking', () => {
  let component: Parking;
  let fixture: ComponentFixture<Parking>;
  let vehicleApi: VehicleApiServiceStub;
  let visitorApi: VisitorApiServiceStub;

  const configure = async () => {
    vehicleApi = new VehicleApiServiceStub();
    visitorApi = new VisitorApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [Parking],
      providers: [
        { provide: VehicleApiService, useValue: vehicleApi },
        { provide: VisitorApiService, useValue: visitorApi },
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
      loading: () => boolean;
      error: () => string | null;
      zones: () => { id: string; occupied: number; capacity: number }[];
      totalFree: () => number;
      institutionalInside: () => number;
      visitorsInside: () => number;
    };

  it('should create', async () => {
    await configure();
    await create();

    expect(component).toBeTruthy();
  });

  it('combina vehículos institucionales y visitantes que siguen dentro, agrupados por tipo', async () => {
    await configure();
    vehicleApi.vehicles = [vehicle('ABC123', 'moto'), vehicle('XYZ987', 'moto')];
    visitorApi.visitors = [visitor(1, 'bicicleta', null), visitor(2, 'scooter', '2026-09-26T10:00:00.000Z')];
    await create();

    const zones = api().zones();
    expect(zones.find((z) => z.id === 'motos')?.occupied).toBe(2);
    expect(zones.find((z) => z.id === 'bicicletas')?.occupied).toBe(1);
    // El scooter ya salió (exited_at no es null): no debe contar.
    expect(zones.find((z) => z.id === 'scooters')?.occupied).toBe(0);
    expect(api().institutionalInside()).toBe(2);
    expect(api().visitorsInside()).toBe(1);
  });

  it('si el backend falla, avisa y no muestra cupos inventados', async () => {
    await configure();
    vehicleApi.fail = true;
    await create();

    expect(api().loading()).toBe(false);
    expect(api().error()).toContain('No pudimos consultar');
  });

  it('muestra el aviso de disponibilidad compartido con /inicio (HU-16)', async () => {
    await configure();
    await create();

    expect(host().querySelector('.zones__disclaimer')?.textContent).toContain('no garantiza un cupo reservado');
  });
});
