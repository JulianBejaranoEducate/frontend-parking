import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  type BackendStudent,
  type BackendUserVehicle,
  StudentsApiService,
} from '../../core/services/modules/students-student-panel/students-api.sp.service';
import { VehiclesApiService } from '../../core/services/modules/vehicles-student-panel/vehicles-api.sp.service';
import { signInForTest } from '../../testing/demo-session';
import { Vehicles } from './vehicles';

/**
 * jsdom (28.1.0, la versión que usan las pruebas) no implementa
 * `showModal`/`close` de `<dialog>` — son APIs reales en todos los
 * navegadores actuales, solo falta el soporte de prueba. Sin este polyfill,
 * cualquier prueba que abra el panel del QR fallaría por un hueco del
 * entorno de pruebas, no del componente.
 */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

const vehicle = (plate: string, type: string, isAuthorized = false): BackendUserVehicle => ({
  plate,
  brand: 'Yamaha',
  model: 2022,
  color: 'Negro',
  type,
  is_authorized: isAuthorized,
  id_owner: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
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

class VehiclesApiServiceStub {
  calls: string[] = [];
  fail = false;

  renderQrCode(plate: string): Promise<string> {
    this.calls.push(plate);
    return this.fail
      ? Promise.reject(new Error('sin conexión'))
      : Promise.resolve(`data:image/png;base64,QR-${plate}`);
  }
}

describe('Vehicles', () => {
  let component: Vehicles;
  let fixture: ComponentFixture<Vehicles>;
  let studentsApi: StudentsApiServiceStub;
  let vehicleApi: VehiclesApiServiceStub;

  const configure = async () => {
    studentsApi = new StudentsApiServiceStub();
    vehicleApi = new VehiclesApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [Vehicles],
      providers: [
        { provide: StudentsApiService, useValue: studentsApi },
        { provide: VehiclesApiService, useValue: vehicleApi },
      ],
    }).compileComponents();

    signInForTest('user');
  };

  const create = async () => {
    fixture = TestBed.createComponent(Vehicles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const vehicleRows = () => [...host().querySelectorAll('.vehicle')];

  it('should create', async () => {
    await configure();
    await create();

    expect(component).toBeTruthy();
  });

  it('mientras consulta el backend, avisa que está cargando', async () => {
    await configure();
    fixture = TestBed.createComponent(Vehicles);
    component = fixture.componentInstance;
    // Sin esperar a que resuelva la promesa: el primer render es el de carga.
    fixture.detectChanges();

    expect(host().querySelector('.empty')?.textContent).toContain('Consultando');
  });

  it('si el backend falla, avisa y no muestra vehículos inventados', async () => {
    await configure();
    studentsApi.fail = true;
    await create();

    expect(host().querySelector('.empty')?.textContent).toContain('No pudimos consultar');
    expect(vehicleRows()).toHaveLength(0);
  });

  it('sin vehículos, muestra el estado vacío', async () => {
    await configure();
    await create();

    expect(host().querySelector('.empty')?.textContent).toContain('Todavía no has registrado');
  });

  it('lista los vehículos reales con su estado y un botón de QR cada uno', async () => {
    await configure();
    studentsApi.student = student([
      vehicle('KZT45F', 'moto', true),
      vehicle('uuid-bici', 'bicicleta', false),
    ]);
    await create();

    expect(vehicleRows()).toHaveLength(2);
    const titles = vehicleRows().map((row) => row.querySelector('.vehicle__title span')?.textContent?.trim());
    expect(titles).toEqual(['KZT45F', 'Bicicleta']);
    const statuses = vehicleRows().map((row) => row.querySelector('.chip')?.textContent?.trim());
    expect(statuses).toEqual(['Activo', 'Inactivo']);
    expect(vehicleRows().every((row) => row.querySelector('button.small-btn'))).toBe(true);
  });

  it('al pedir el código QR, lo genera con el identificador real del vehículo y lo muestra en el panel', async () => {
    await configure();
    // El backend le asigna su propio identificador a lo que no lleva placa real.
    studentsApi.student = student([vehicle('5333040a-uuid', 'scooter')]);
    await create();

    host().querySelector<HTMLButtonElement>('.vehicle button.small-btn')?.click();
    await fixture.whenStable();

    expect(vehicleApi.calls).toEqual(['5333040a-uuid']);
    expect(host().querySelector('dialog[open]')).toBeTruthy();
    expect(host().querySelector('.qr-dialog__image')?.getAttribute('src')).toBe(
      'data:image/png;base64,QR-5333040a-uuid',
    );
  });

  it('si falla la generación del QR, lo avisa dentro del panel', async () => {
    await configure();
    studentsApi.student = student([vehicle('KZT45F', 'moto')]);
    vehicleApi.fail = true;
    await create();

    host().querySelector<HTMLButtonElement>('.vehicle button.small-btn')?.click();
    await fixture.whenStable();

    expect(host().querySelector('.qr-dialog__status')?.textContent).toContain('No pudimos generar');
    expect(host().querySelector('.qr-dialog__image')).toBeNull();
  });

  it('cerrar el panel limpia el QR mostrado', async () => {
    await configure();
    studentsApi.student = student([vehicle('KZT45F', 'moto')]);
    await create();

    host().querySelector<HTMLButtonElement>('.vehicle button.small-btn')?.click();
    await fixture.whenStable();
    host().querySelector<HTMLButtonElement>('.qr-dialog__close')?.click();
    await fixture.whenStable();

    expect(host().querySelector('dialog[open]')).toBeNull();
    expect(host().querySelector('.qr-dialog__image')).toBeNull();
  });
});
