import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UsersApiService } from '../../core/services/api/users-api.service';
import { type BackendVehicle, type NewVehicle, VehiclesApiService } from '../../core/services/api/vehicles-api.service';
import { UsersApiStub, testUser, testUserVehicle } from '../../testing/backend-stubs';
import { TEST_ACCOUNTS, signInForTest } from '../../testing/test-session';
import { RegisterVehicle } from './register-vehicle';

/** `VehiclesApiService` de mentira: guarda lo que se le pidió crear. */
class VehiclesApiStub {
  calls: NewVehicle[] = [];
  error: unknown = null;

  create(vehicle: NewVehicle): Promise<BackendVehicle> {
    this.calls.push(vehicle);

    if (this.error) {
      return Promise.reject(this.error);
    }

    return Promise.resolve({
      plate: vehicle.plate ?? 'generado-1',
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      type: vehicle.type,
      is_authorized: false,
      id_owner: vehicle.ownerUid,
    });
  }
}

type Api = {
  step: () => string;
  form: any;
  chooseType: (type: string) => void;
  continueFromType: () => void;
  continueFromDetails: () => void;
  toggleDeclaration: (event: Event) => void;
  submit: () => Promise<void>;
  submitted: () => { type: string; plate?: string } | null;
  submitError: () => string | null;
  summaryVehicle: () => unknown;
};

describe('RegisterVehicle', () => {
  let component: RegisterVehicle;
  let fixture: ComponentFixture<RegisterVehicle>;
  let vehiclesApi: VehiclesApiStub;
  let usersApi: UsersApiStub;

  const configure = async () => {
    vehiclesApi = new VehiclesApiStub();
    usersApi = new UsersApiStub();

    await TestBed.configureTestingModule({
      imports: [RegisterVehicle],
      providers: [
        provideRouter([]),
        { provide: VehiclesApiService, useValue: vehiclesApi },
        { provide: UsersApiService, useValue: usersApi },
      ],
    }).compileComponents();

    signInForTest('user');
  };

  const create = async () => {
    fixture = TestBed.createComponent(RegisterVehicle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const api = () => component as unknown as Api;
  const host = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.whenStable();
  const acceptDeclaration = () => api().toggleDeclaration({ target: { checked: true } } as unknown as Event);

  describe('registro', () => {
    beforeEach(async () => {
      await configure();
      await create();
    });

    it('arranca pidiendo el tipo de vehículo y no avanza sin elegirlo', async () => {
      expect(host().querySelectorAll('.type')).toHaveLength(3);

      api().continueFromType();
      await render();

      expect(api().step()).toBe('type');
      expect(host().querySelector('#type-error')).toBeTruthy();
    });

    it('la moto pide placa, marca, modelo y color: lo que guarda el backend', async () => {
      api().chooseType('moto');
      api().continueFromType();
      await render();

      for (const id of ['plate', 'brand', 'modelYear', 'color']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
    });

    it('la bicicleta y el scooter piden marca y color, sin placa', async () => {
      for (const type of ['bicicleta', 'scooter']) {
        api().chooseType(type);
        api().continueFromType();
        await render();

        expect(host().querySelector('#brand'), type).toBeTruthy();
        expect(host().querySelector('#color'), type).toBeTruthy();
        expect(host().querySelector('#plate'), type).toBeNull();
        expect(host().querySelector('#modelYear'), type).toBeNull();
        api().chooseType('moto');
      }
    });

    it('la marca es obligatoria en los tres tipos: el backend la exige siempre', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({ brand: '', color: 'Negro' });
      api().continueFromDetails();

      expect(api().step()).toBe('details');

      api().form.patchValue({ brand: 'Xiaomi' });
      api().continueFromDetails();

      expect(api().step()).toBe('review');
      expect(api().summaryVehicle()).toEqual({ type: 'scooter', brand: 'Xiaomi', color: 'Negro' });
    });

    it('no avanza con datos incompletos y señala los errores', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().continueFromDetails();
      await render();

      expect(api().step()).toBe('details');
      expect(host().querySelector('#plate-error')?.textContent).toContain('Escribe la placa');
    });

    it('exige la declaración antes de registrar', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      api().form.patchValue({ brand: 'Trek', color: 'Verde' });
      api().continueFromDetails();

      await api().submit();
      await render();

      expect(api().step()).toBe('review');
      expect(vehiclesApi.calls).toHaveLength(0);
      expect(host().querySelector('#declaration-error')).toBeTruthy();
    });

    it('una moto completa se crea en el backend a nombre de la sesión y queda pendiente de aprobación', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({ plate: 'QAZ12W', brand: 'Honda', modelYear: 2023, color: 'Rojo' });
      api().continueFromDetails();
      acceptDeclaration();
      await api().submit();
      await render();

      expect(vehiclesApi.calls).toEqual([
        { type: 'moto', brand: 'Honda', model: 2023, color: 'Rojo', plate: 'QAZ12W', ownerUid: TEST_ACCOUNTS.user.uid },
      ]);
      expect(api().step()).toBe('done');
      expect(api().submitted()).toMatchObject({ type: 'moto', plate: 'QAZ12W' });
      expect(host().querySelector('.done__vehicle .chip')?.textContent?.trim()).toBe('Pendiente');
    });

    it('sin placa (bicicleta), no manda placa: el backend asigna su propio identificador', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      api().form.patchValue({ brand: 'Trek', color: 'Verde' });
      api().continueFromDetails();
      acceptDeclaration();
      await api().submit();

      expect(vehiclesApi.calls[0]).not.toHaveProperty('plate');
      expect(vehiclesApi.calls[0]).toMatchObject({ type: 'bicicleta', brand: 'Trek', color: 'Verde' });
    });

    it('si el backend rechaza el registro, se queda en la revisión y muestra su motivo', async () => {
      vehiclesApi.error = new HttpErrorResponse({ status: 409, error: { details: 'La placa ya está registrada' } });
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({ plate: 'QAZ12W', brand: 'Honda', modelYear: 2023, color: 'Rojo' });
      api().continueFromDetails();
      acceptDeclaration();
      await api().submit();
      await render();

      expect(api().step()).toBe('review');
      expect(api().submitError()).toContain('La placa ya está registrada');
      expect(host().querySelector('.alert')?.textContent).toContain('La placa ya está registrada');
    });

    it('sin conexión, lo dice sin inventar un motivo', async () => {
      vehiclesApi.error = new Error('sin conexión');
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({ brand: 'Xiaomi', color: 'Gris' });
      api().continueFromDetails();
      acceptDeclaration();
      await api().submit();

      expect(api().step()).toBe('review');
      expect(api().submitError()).toContain('Revisa tu conexión');
    });
  });

  describe('placa repetida', () => {
    it('avisa si la persona ya registró un vehículo con esa placa', async () => {
      await configure();
      usersApi.user = testUser([testUserVehicle('KZT45F', 'moto')]);
      await create();

      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({ plate: 'KZT45F' });
      api().form.controls.plate.markAsTouched();
      await render();

      expect(host().querySelector('#plate-error')?.textContent).toContain('Ya registraste un vehículo con esta placa');
    });
  });

  describe('tope de vehículos', () => {
    it('mientras consulta el backend, avisa que está cargando', async () => {
      await configure();
      fixture = TestBed.createComponent(RegisterVehicle);
      component = fixture.componentInstance;
      // Sin esperar a que resuelva la promesa: el primer render es el de carga.
      fixture.detectChanges();

      expect(host().querySelector('.step__lead')?.textContent).toContain('Consultando');
    });

    it('con 5 vehículos, no deja seguir y lo explica', async () => {
      await configure();
      usersApi.user = testUser(
        ['AAA11A', 'BBB22B', 'CCC33C', 'DDD44D', 'EEE55E'].map((plate) => testUserVehicle(plate, 'moto')),
      );
      await create();

      expect(host().querySelector('#step-title')?.textContent).toContain('Llegaste al máximo de vehículos');
      expect(host().querySelectorAll('.type')).toHaveLength(0);
    });

    it('si falla la consulta al backend, no bloquea el registro', async () => {
      await configure();
      usersApi.fail = true;
      await create();

      expect(host().querySelector('#step-title')?.textContent).not.toContain('Llegaste al máximo');
      expect(host().querySelectorAll('.type')).toHaveLength(3);
    });
  });
});
