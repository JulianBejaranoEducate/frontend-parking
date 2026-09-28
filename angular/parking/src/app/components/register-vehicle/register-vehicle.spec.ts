import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DocumentKind, RegistrationDocument } from '../../core/models/vehicle-registration';
import {
  type BackendStudent,
  type BackendUserVehicle,
  StudentsApiService,
} from '../../core/services/modules/students-student-panel/students-api.sp.service';
import {
  type BackendVehicle,
  type VehicleRegistrationInput,
  VehiclesApiService,
} from '../../core/services/modules/vehicles-student-panel/vehicles-api.sp.service';
import { UploadService } from '../../core/services/upload.service';
import { VehicleRegistrationService } from '../../core/services/vehicle-registration.service';
import { signInForTest } from '../../testing/demo-session';
import { RegisterVehicle } from './register-vehicle';

/** Evita el canvas de jsdom: la foto "se procesa" al instante. */
class UploadServiceStub extends UploadService {
  override prepare(file: File, kind: DocumentKind): Promise<RegistrationDocument> {
    return Promise.resolve({
      kind,
      fileName: file.name,
      mimeType: 'image/jpeg',
      dataUrl: 'data:image/jpeg;base64,AAAA',
      uploadedAt: new Date(),
    });
  }
}

/** No extiende VehiclesApiService (que inyecta HttpClient) para no tener que proveerlo. */
class VehiclesApiServiceStub {
  calls: VehicleRegistrationInput[] = [];
  fail = false;

  postCreate(input: VehicleRegistrationInput): Promise<BackendVehicle> {
    this.calls.push(input);

    if (this.fail) {
      return Promise.reject(new Error('sin conexión'));
    }

    return Promise.resolve({
      plate: input.plate ?? 'generado-1',
      brand: input.brand,
      model: input.model,
      color: input.color,
      type: input.type,
      id_owner: input.ownerUid,
    });
  }
}

const backendVehicle = (plate: string): BackendUserVehicle => ({
  plate,
  brand: 'Yamaha',
  model: 2022,
  color: 'Negro',
  type: 'moto',
  is_authorized: false,
  id_owner: 'Ctj1W2XEcKVNxKt7seae8xvR8fR2',
});

/** No extiende StudentsApiService (que inyecta HttpClient) para no tener que proveerlo. */
class StudentsApiServiceStub {
  /** Por defecto, sin vehículos reales: no bloquea ninguna prueba existente. */
  vehicles: BackendUserVehicle[] = [];

  findById(id: string): Promise<BackendStudent> {
    return Promise.resolve({
      id,
      name: 'test s',
      email: 'test@test.com',
      roleId: 3,
      status_user: true,
      vehicles: this.vehicles,
    });
  }
}

type Api = {
  step: () => string;
  form: any;
  chooseType: (type: string) => void;
  continueFromType: () => void;
  continueFromDetails: () => void;
  continueFromDocuments: () => void;
  toggleDeclaration: (event: Event) => void;
  submit: () => Promise<void>;
  onFileSelected: (event: Event, kind: DocumentKind) => Promise<void>;
  submitted: () => { id: string } | null;
};

describe('RegisterVehicle', () => {
  let component: RegisterVehicle;
  let fixture: ComponentFixture<RegisterVehicle>;
  let registrations: VehicleRegistrationService;
  let vehicleApi: VehiclesApiServiceStub;
  let studentsApi: StudentsApiServiceStub;

  const configure = async () => {
    // VehicleRegistrationService persiste en localStorage de verdad (demo-storage.ts):
    // sin limpiarlo, una prueba que deje una solicitud sembrada en otro estado
    // (p. ej. "actualizar un documento pedido") se filtra a la siguiente prueba de
    // este archivo, que arranca esperando el estado original de la semilla.
    localStorage.clear();

    vehicleApi = new VehiclesApiServiceStub();
    studentsApi = new StudentsApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [RegisterVehicle],
      providers: [
        provideRouter([]),
        { provide: UploadService, useClass: UploadServiceStub },
        { provide: VehiclesApiService, useValue: vehicleApi },
        { provide: StudentsApiService, useValue: studentsApi },
      ],
    }).compileComponents();

    signInForTest('user');
    registrations = TestBed.inject(VehicleRegistrationService);
  };

  const create = async (actualizar?: string) => {
    fixture = TestBed.createComponent(RegisterVehicle);
    component = fixture.componentInstance;

    if (actualizar) {
      fixture.componentRef.setInput('actualizar', actualizar);
    }

    await fixture.whenStable();
  };

  const api = () => component as unknown as Api;
  const host = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.whenStable();

  const attach = (kind: DocumentKind) =>
    api().onFileSelected(
      {
        target: { files: [new File(['x'], 'tarjeta.jpg', { type: 'image/jpeg' })], value: '' },
      } as unknown as Event,
      kind,
    );

  const acceptDeclaration = () =>
    api().toggleDeclaration({ target: { checked: true } } as unknown as Event);

  describe('registro nuevo', () => {
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

    it('la moto pide placa, marca, línea, modelo y color; nada de datos personales', async () => {
      api().chooseType('moto');
      api().continueFromType();
      await render();

      for (const id of ['plate', 'brand', 'line', 'modelYear', 'color']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
      for (const id of ['firstName', 'lastName', 'documentType', 'documentNumber', 'frameSerial']) {
        expect(host().querySelector(`#${id}`), id).toBeNull();
      }
    });

    it('la bicicleta pide marca, color y serial opcional, sin placa ni datos personales', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      await render();

      for (const id of ['brand', 'color', 'frameSerial']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
      for (const id of ['plate', 'firstName', 'lastName', 'documentType', 'documentNumber']) {
        expect(host().querySelector(`#${id}`), id).toBeNull();
      }
    });

    it('el scooter pide marca y color, sin placa ni datos personales', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      await render();

      for (const id of ['brand', 'color']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
      // El backend real exige marca en los tres tipos, sin excepción: ya no es opcional.
      expect(host().querySelector('label[for="brand"]')?.textContent).not.toContain('(opcional)');
      for (const id of [
        'plate',
        'frameSerial',
        'firstName',
        'lastName',
        'documentType',
        'documentNumber',
      ]) {
        expect(host().querySelector(`#${id}`), id).toBeNull();
      }

      expect(api().form.valid).toBe(false);
      api().form.patchValue({ color: 'Negro' });
      expect(api().form.valid).toBe(false);
      api().form.patchValue({ brand: 'Xiaomi' });
      expect(api().form.valid).toBe(true);
    });

    it('no avanza con datos incompletos y señala los errores', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().continueFromDetails();
      await render();

      expect(api().step()).toBe('details');
      expect(host().querySelector('#plate-error')?.textContent).toContain('Escribe la placa');
    });

    it('avisa si la placa ya tiene un registro vigente', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({ plate: 'KZT45F' });
      api().form.controls.plate.markAsTouched();
      await render();

      expect(host().querySelector('#plate-error')?.textContent).toContain(
        'ya tiene un registro vigente',
      );
    });

    it('una moto completa llega a la administración como pendiente, con el dueño de la sesión', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({
        plate: 'QAZ12W',
        brand: 'Honda',
        line: 'CB 125F',
        modelYear: 2023,
        color: 'Rojo',
      });
      api().continueFromDetails();
      expect(api().step()).toBe('documents');

      // Sin la tarjeta de propiedad no se puede seguir.
      api().continueFromDocuments();
      expect(api().step()).toBe('documents');

      await attach('property-card-front');
      api().continueFromDocuments();
      expect(api().step()).toBe('review');

      // La declaración es obligatoria.
      api().submit();
      expect(api().step()).toBe('review');

      acceptDeclaration();
      api().submit();
      await render();

      expect(api().step()).toBe('done');
      const created = registrations.find(api().submitted()?.id);
      expect(created?.status).toBe('pending');
      // El dueño sale de la cuenta con sesión (demo: "Julian Bejarano"), no de un formulario.
      expect(created?.owner).toEqual({ firstName: 'Julian', lastName: 'Bejarano' });
      expect(created?.vehicle).toEqual({
        type: 'moto',
        plate: 'QAZ12W',
        brand: 'Honda',
        line: 'CB 125F',
        modelYear: 2023,
        color: 'Rojo',
      });
      expect(created?.documents.map((document) => document.kind)).toEqual(['property-card-front']);
    });

    it('además de la solicitud, crea el vehículo de verdad en el backend real', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({
        plate: 'RTG34K',
        brand: 'Honda',
        line: 'CB 125F',
        modelYear: 2023,
        color: 'Rojo',
      });
      api().continueFromDetails();
      await attach('property-card-front');
      api().continueFromDocuments();
      acceptDeclaration();
      await api().submit();

      expect(vehicleApi.calls).toHaveLength(1);
      expect(vehicleApi.calls[0]).toMatchObject({
        type: 'moto',
        brand: 'Honda',
        color: 'Rojo',
        model: 2023,
        plate: 'RTG34K',
        // El uid real de la cuenta con sesión (DEMO_ACCOUNTS.user en esta prueba).
        ownerUid: 'demo-uid',
      });
      // La "línea" no existe en el backend real: no se manda, aunque se guarde en la solicitud de demo.
      expect(vehicleApi.calls[0]).not.toHaveProperty('line');
    });

    it('si el backend real falla, la solicitud igual queda guardada y no se muestra ningún error', async () => {
      vehicleApi.fail = true;
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({ brand: 'Xiaomi', color: 'Gris' });
      api().continueFromDetails();
      api().continueFromDocuments();
      acceptDeclaration();
      await api().submit();

      expect(api().step()).toBe('done');
      expect(registrations.find(api().submitted()?.id)?.status).toBe('pending');
    });

    it('la bicicleta se envía sin fotos, con el serial y el dueño de la sesión', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      api().form.patchValue({ brand: 'Trek', color: 'Verde', frameSerial: 'WTU123456' });

      api().continueFromDetails();
      api().continueFromDocuments();
      acceptDeclaration();
      api().submit();

      const created = registrations.find(api().submitted()?.id);
      expect(created?.vehicle).toEqual({
        type: 'bicicleta',
        brand: 'Trek',
        color: 'Verde',
        frameSerial: 'WTU123456',
      });
      expect(created?.owner).toEqual({ firstName: 'Julian', lastName: 'Bejarano' });
      expect(created?.documents).toEqual([]);
    });

    it('el scooter sin marca no avanza: el backend real la exige siempre', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({ brand: '', color: 'Negro' });
      api().continueFromDetails();

      expect(api().step()).toBe('details');
    });

    it('el scooter completo se describe con marca y color', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({ brand: 'Xiaomi', color: 'Negro' });
      api().continueFromDetails();

      expect(api().step()).toBe('documents');
      expect((component as unknown as { summaryVehicle: () => unknown }).summaryVehicle()).toEqual({
        type: 'scooter',
        brand: 'Xiaomi',
        color: 'Negro',
      });
    });
  });

  // ---- Tope de vehículos: contra el backend real, no contra la demo -----------------
  describe('tope de vehículos', () => {
    it('mientras consulta el backend, avisa que está cargando', async () => {
      await configure();
      fixture = TestBed.createComponent(RegisterVehicle);
      component = fixture.componentInstance;
      // Sin esperar a que resuelva la promesa: el primer render es el de carga.
      fixture.detectChanges();

      expect(host().querySelector('.step__lead')?.textContent).toContain('Consultando');
    });

    it('con 5 vehículos reales, no deja seguir y lo explica', async () => {
      await configure();
      studentsApi.vehicles = [
        backendVehicle('AAA11A'),
        backendVehicle('BBB22B'),
        backendVehicle('CCC33C'),
        backendVehicle('DDD44D'),
        backendVehicle('EEE55E'),
      ];
      await create();

      expect(host().querySelector('#step-title')?.textContent).toContain(
        'Llegaste al máximo de vehículos',
      );
      expect(host().querySelectorAll('.type')).toHaveLength(0);
    });

    it(
      'aunque la demostración ya tenga 5 solicitudes, si el backend real tiene menos, deja registrar ' +
        '(bug reportado: el dashboard mostraba cupo pero el registro decía "llegaste al máximo")',
      async () => {
        await configure();

        // La demostración (uid 'demo-uid') llega a su propio tope de 5 solicitudes,
        // sin relación con los vehículos reales del uid sembrado que usa el backend.
        const bike = {
          owner: { firstName: 'Julian', lastName: 'Bejarano' },
          vehicle: { type: 'bicicleta' as const },
          documents: [],
        };
        registrations.submit(bike);
        registrations.submit(bike);
        expect(registrations.mine().length).toBeGreaterThanOrEqual(5);

        // El backend real (el uid de la sesión) solo tiene 2 vehículos.
        studentsApi.vehicles = [backendVehicle('AAA11A'), backendVehicle('BBB22B')];
        await create();

        expect(host().querySelector('#step-title')?.textContent).not.toContain(
          'Llegaste al máximo',
        );
        expect(host().querySelectorAll('.type')).toHaveLength(3);
      },
    );

    it('si falla la consulta al backend, no bloquea el registro (falla abierto)', async () => {
      await configure();
      studentsApi.findById = () => Promise.reject(new Error('sin conexión'));
      await create();

      expect(host().querySelector('#step-title')?.textContent).not.toContain('Llegaste al máximo');
      expect(host().querySelectorAll('.type')).toHaveLength(3);
    });
  });

  describe('actualizar un documento pedido', () => {
    beforeEach(async () => {
      await configure();

      // La administración pide actualizar el serial de la bicicleta de Julian.
      signInForTest('admin');
      registrations.requestUpdate('reg-bianchi', 'frame-serial', 'No se lee el serial.');
      signInForTest('user');
    });

    it('muestra lo que pidió la administración y solo ese documento', async () => {
      await create('reg-bianchi');

      expect(host().querySelector('.request-note')?.textContent).toContain('No se lee el serial.');
      expect(host().querySelectorAll('.upload')).toHaveLength(1);
      expect(host().querySelector('.upload__label')?.textContent).toContain('serial del marco');
    });

    it('reenviar el documento devuelve la solicitud a la fila de revisión', async () => {
      await create('reg-bianchi');

      api().continueFromDocuments();
      expect(registrations.find('reg-bianchi')?.status).toBe('needs-update');

      await attach('frame-serial');
      api().continueFromDocuments();
      await render();

      expect(api().step()).toBe('done');
      expect(registrations.find('reg-bianchi')?.status).toBe('pending');
    });

    it('no deja actualizar solicitudes ajenas', async () => {
      await create('reg-camila');

      expect(host().querySelector('#step-title')?.textContent).toContain(
        'No hay nada que actualizar',
      );
    });
  });
});
