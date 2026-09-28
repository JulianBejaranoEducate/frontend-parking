import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DocumentKind } from '../../core/models/vehicle-registration';
import { signInForTest } from '../../testing/demo-session';
import { RegisterVehicle } from './register-vehicle';

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
  onFileSelected: (event: Event, kind: DocumentKind) => void;
  submitted: () => unknown;
};

/** Parte del aviso que dan adjuntar y enviar mientras no haya backend. */
const NO_BACKEND = 'no está conectado al backend';

describe('RegisterVehicle', () => {
  let component: RegisterVehicle;
  let fixture: ComponentFixture<RegisterVehicle>;

  const configure = async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterVehicle],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest('user');
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

    it('compara en el acto los nombres escritos con la cuenta de la sesión', async () => {
      api().chooseType('moto');
      api().continueFromType();

      api().form.patchValue({ firstName: 'Estudiante Andrés', lastName: 'Prueba Rojas' });
      expect(api().nameCheck()).toBe('match');

      api().form.patchValue({ firstName: 'Carlos', lastName: 'Prueba' });
      await render();
      expect(api().nameCheck()).toBe('partial');
      expect(host().querySelector('.name-check--warning')?.textContent).toContain('Estudiante de prueba');
    });

    it('una moto completa llega a documentos, pero adjuntar avisa que falta el backend', async () => {
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

      attach('property-card-front');
      await render();

      expect(host().querySelector('.upload .field__error')?.textContent).toContain(NO_BACKEND);

      // La tarjeta de propiedad no quedó adjunta, así que no se puede seguir.
      api().continueFromDocuments();
      expect(api().step()).toBe('documents');
    });

    it('la bicicleta llega a confirmar, pero enviar avisa que falta el backend', async () => {
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
      expect(api().step()).toBe('review');

      // La declaración es obligatoria.
      api().submit();
      await render();
      expect(host().querySelector('.alert')).toBeNull();

      acceptDeclaration();
      api().submit();
      await render();

      expect(api().step()).toBe('review');
      expect(api().submitted()).toBeNull();
      expect(host().querySelector('.alert')?.textContent).toContain(NO_BACKEND);
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
    beforeEach(configure);

    it('sin solicitudes guardadas no hay nada que actualizar', async () => {
      await create('reg-cualquiera');

      expect(host().querySelector('#step-title')?.textContent).toContain('No hay nada que actualizar');
    });
  });
});
