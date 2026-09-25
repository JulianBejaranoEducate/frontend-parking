import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DocumentKind, RegistrationDocument } from '../../core/models/vehicle-registration';
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

type Api = {
  step: () => string;
  form: any;
  nameCheck: () => string | null;
  chooseType: (type: string) => void;
  continueFromType: () => void;
  continueFromDetails: () => void;
  continueFromDocuments: () => void;
  toggleDeclaration: (event: Event) => void;
  submit: () => void;
  onFileSelected: (event: Event, kind: DocumentKind) => Promise<void>;
  submitted: () => { id: string } | null;
};

describe('RegisterVehicle', () => {
  let component: RegisterVehicle;
  let fixture: ComponentFixture<RegisterVehicle>;
  let registrations: VehicleRegistrationService;

  const configure = async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterVehicle],
      providers: [provideRouter([]), { provide: UploadService, useClass: UploadServiceStub }],
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
      { target: { files: [new File(['x'], 'tarjeta.jpg', { type: 'image/jpeg' })], value: '' } } as unknown as Event,
      kind,
    );

  const acceptDeclaration = () => api().toggleDeclaration({ target: { checked: true } } as unknown as Event);

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

    it('la moto pide documento, placa, marca, línea, modelo y color', async () => {
      api().chooseType('moto');
      api().continueFromType();
      await render();

      for (const id of ['firstName', 'lastName', 'documentNumber', 'plate', 'brand', 'line', 'modelYear', 'color']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
      expect(host().querySelector('#frameSerial')).toBeNull();
    });

    it('la bicicleta pide documento, marca, color y serial opcional, sin placa', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      await render();

      // Portería busca las bicicletas por documento (PEN-009).
      for (const id of ['documentNumber', 'brand', 'color', 'frameSerial']) {
        expect(host().querySelector(`#${id}`), id).toBeTruthy();
      }
      expect(host().querySelector('#plate')).toBeNull();
    });

    it('el scooter pide documento y color; la marca es opcional', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      await render();

      expect(host().querySelector('#documentNumber')).toBeTruthy();
      expect(host().querySelector('#color')).toBeTruthy();
      expect(host().querySelector('label[for="brand"]')?.textContent).toContain('(opcional)');
      expect(host().querySelector('#plate')).toBeNull();
      expect(host().querySelector('#frameSerial')).toBeNull();

      api().form.patchValue({ firstName: 'Julian', lastName: 'Bejarano', documentNumber: '1012345678' });
      expect(api().form.valid).toBe(false);

      api().form.patchValue({ color: 'Negro' });
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

    it('compara en el acto los nombres escritos con la cuenta institucional', async () => {
      api().chooseType('moto');
      api().continueFromType();

      api().form.patchValue({ firstName: 'Julian Andrés', lastName: 'Bejarano Rojas' });
      expect(api().nameCheck()).toBe('match');

      api().form.patchValue({ firstName: 'Carlos', lastName: 'Bejarano' });
      await render();
      expect(api().nameCheck()).toBe('partial');
      expect(host().querySelector('.name-check--warning')?.textContent).toContain('Julian Bejarano');
    });

    it('avisa si la placa ya tiene un registro vigente', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({ plate: 'KZT45F' });
      api().form.controls.plate.markAsTouched();
      await render();

      expect(host().querySelector('#plate-error')?.textContent).toContain('ya tiene un registro vigente');
    });

    it('una moto completa llega a la administración como pendiente', async () => {
      api().chooseType('moto');
      api().continueFromType();
      api().form.patchValue({
        firstName: 'Julian Andrés',
        lastName: 'Bejarano Rojas',
        documentNumber: '1012345678',
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

    it('la bicicleta se envía sin fotos, con el documento del dueño y el serial', async () => {
      api().chooseType('bicicleta');
      api().continueFromType();
      api().form.patchValue({
        firstName: 'Julian',
        lastName: 'Bejarano',
        brand: 'Trek',
        color: 'Verde',
        frameSerial: 'WTU123456',
      });

      // Sin documento no avanza: es lo que busca el guardia en portería.
      api().continueFromDetails();
      expect(api().step()).toBe('details');

      api().form.patchValue({ documentNumber: '1012345678' });
      api().continueFromDetails();
      api().continueFromDocuments();
      acceptDeclaration();
      api().submit();

      const created = registrations.find(api().submitted()?.id);
      expect(created?.vehicle).toEqual({ type: 'bicicleta', brand: 'Trek', color: 'Verde', frameSerial: 'WTU123456' });
      expect(created?.owner).toMatchObject({ documentType: 'CC', documentNumber: '1012345678' });
      expect(created?.documents).toEqual([]);
    });

    it('el scooter sin marca avanza y se describe solo con su color', async () => {
      api().chooseType('scooter');
      api().continueFromType();
      api().form.patchValue({
        firstName: 'Julian',
        lastName: 'Bejarano',
        documentNumber: '1012345678',
        brand: '  ',
        color: 'Negro',
      });
      api().continueFromDetails();

      expect(api().step()).toBe('documents');
      expect((component as unknown as { summaryVehicle: () => unknown }).summaryVehicle()).toEqual({
        type: 'scooter',
        color: 'Negro',
      });
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

      expect(host().querySelector('#step-title')?.textContent).toContain('No hay nada que actualizar');
    });
  });
});
