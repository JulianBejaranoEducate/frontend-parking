import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { VehicleRequirements } from '../../core/models/vehicle';
import { VisitorPassService } from '../../core/services/visitor-pass.service';
import { Visitor } from './visitor';

/** Evita cargar la librería de QR (usa canvas) dentro de las pruebas. */
class VisitorPassServiceStub extends VisitorPassService {
  override renderQrCode(): Promise<string> {
    return Promise.resolve('data:image/png;base64,stub');
  }
}

describe('Visitor', () => {
  let component: Visitor;
  let fixture: ComponentFixture<Visitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Visitor],
      providers: [provideRouter([]), { provide: VisitorPassService, useClass: VisitorPassServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(Visitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // Los miembros del componente son protected: el acceso desde la prueba pasa
  // por este cast, que es la forma habitual de probarlos sin abrirlos al resto.
  const api = () =>
    component as unknown as {
      form: any;
      pass: () => any;
      qrDataUrl: () => string | null;
      requires: () => VehicleRequirements;
      submit: () => Promise<void>;
      regenerate: () => Promise<void>;
      normalizePlate: () => void;
      normalizeDocumentNumber: () => void;
      normalizeSerial: () => void;
      registerAnother: () => void;
    };

  const fillPersonalData = () =>
    api().form.patchValue({
      firstName: 'Ana María',
      lastName: 'Rodríguez',
      documentType: 'CC',
      documentNumber: '1012345678',
      reason: 'Reunión con admisiones',
    });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pide los datos personales, los del vehículo y el motivo', () => {
    expect(Object.keys(api().form.controls)).toEqual([
      'firstName',
      'lastName',
      'documentType',
      'documentNumber',
      'vehicleType',
      'vehicleBrand',
      'vehicleColor',
      'plate',
      'frameSerial',
      'reason',
    ]);
    expect(api().form.invalid).toBe(true);
  });

  it('exige un número de documento de 6 a 11 dígitos', () => {
    const number = api().form.controls.documentNumber;

    for (const valid of ['123456', '1012345678', '12345678901']) {
      number.setValue(valid);
      expect(number.valid).toBe(true);
    }

    for (const invalid of ['12345', '123456789012', '10.123.456']) {
      number.setValue(invalid);
      expect(number.valid).toBe(false);
    }
  });

  it('solo acepta placas de moto: el formato de automóvil queda rechazado', () => {
    api().form.controls.vehicleType.setValue('moto');
    const plate = api().form.controls.plate;

    for (const valid of ['ABC12D', 'ABC12']) {
      plate.setValue(valid);
      expect(plate.valid).toBe(true);
    }

    // ABC123 es placa de automóvil y ya no se admite.
    for (const invalid of ['ABC123', 'AB12D', '12ABCD', 'ABCD12']) {
      plate.setValue(invalid);
      expect(plate.valid).toBe(false);
    }
  });

  it('normaliza la placa, el documento y el serial mientras se escriben', () => {
    api().form.controls.plate.setValue('abc-12d');
    api().normalizePlate();
    expect(api().form.controls.plate.value).toBe('ABC12D');

    api().form.controls.documentNumber.setValue('10.123.456');
    api().normalizeDocumentNumber();
    expect(api().form.controls.documentNumber.value).toBe('10123456');

    api().form.controls.frameSerial.setValue('wbk 2291037');
    api().normalizeSerial();
    expect(api().form.controls.frameSerial.value).toBe('WBK2291037');
  });

  it('la moto pide marca, color y placa', () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('moto');

    expect(api().requires()).toEqual({ brand: 'required', color: 'required', plate: 'required', frameSerial: 'none' });
    expect(api().form.invalid).toBe(true);

    api().form.patchValue({ vehicleBrand: 'Yamaha', vehicleColor: 'Negro', plate: 'ABC12D' });
    expect(api().form.valid).toBe(true);
  });

  it('la bicicleta pide marca y color, sin placa, y el serial es opcional', () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('bicicleta');

    expect(api().requires()).toEqual({ brand: 'required', color: 'required', plate: 'none', frameSerial: 'optional' });

    api().form.patchValue({ vehicleBrand: 'Bianchi', vehicleColor: 'Azul' });
    expect(api().form.valid).toBe(true);

    // Opcional no quiere decir sin formato: si se escribe, tiene que ser un serial.
    api().form.controls.frameSerial.setValue('A#1');
    expect(api().form.valid).toBe(false);

    api().form.controls.frameSerial.setValue('WBK2291037');
    expect(api().form.valid).toBe(true);
  });

  it('el scooter pide el color y deja la marca opcional', () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('scooter');

    expect(api().requires()).toEqual({ brand: 'optional', color: 'required', plate: 'none', frameSerial: 'none' });
    expect(api().form.invalid).toBe(true);

    api().form.patchValue({ vehicleColor: 'Gris' });
    expect(api().form.valid).toBe(true);
  });

  it('al cambiar de vehículo vacía los campos que el nuevo no usa', async () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('bicicleta');
    api().form.patchValue({ vehicleBrand: 'GW', vehicleColor: 'Verde', frameSerial: 'GWL458812' });

    api().form.controls.vehicleType.setValue('moto');
    expect(api().form.controls.frameSerial.value).toBe('');
    api().form.controls.plate.setValue('ABC12D');

    api().form.controls.vehicleType.setValue('scooter');
    expect(api().form.controls.plate.value).toBe('');
    // Marca y color también sirven para el scooter: no se borra lo que la persona ya escribió.
    expect(api().form.controls.vehicleColor.value).toBe('Verde');

    await api().submit();
    expect(api().pass().visitor.vehicle).toEqual({ type: 'scooter', brand: 'GW', color: 'Verde' });
  });

  it('los datos opcionales que quedan en blanco no llegan al pase', async () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('scooter');
    api().form.patchValue({ vehicleBrand: '   ', vehicleColor: 'Gris' });

    await api().submit();

    expect(api().pass().visitor.vehicle).toEqual({ type: 'scooter', color: 'Gris' });
  });

  it('no emite ningún pase mientras el formulario esté incompleto', async () => {
    await api().submit();

    expect(api().pass()).toBeNull();
  });

  it('guarda en el pase el vehículo completo junto al motivo de la visita', async () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('moto');
    api().form.patchValue({ vehicleBrand: 'Yamaha', vehicleColor: 'Negro', plate: 'ABC12D' });

    await api().submit();
    const pass = api().pass();

    expect(pass.visitor.vehicle).toEqual({
      type: 'moto',
      brand: 'Yamaha',
      color: 'Negro',
      plate: 'ABC12D',
    });
    expect(pass.visitor.reason).toBe('Reunión con admisiones');
    expect(pass.status).toBe('pending');
    expect(api().qrDataUrl()).toContain('data:image');
  });

  it('el pase queda guardado para que portería lo valide al escanearlo', async () => {
    fillPersonalData();
    api().form.controls.vehicleType.setValue('bicicleta');
    api().form.patchValue({ vehicleBrand: 'GW', vehicleColor: 'Verde', frameSerial: 'GWL458812' });

    await api().submit();
    const stored = TestBed.inject(VisitorPassService).find(api().pass().token);

    expect(stored?.status).toBe('pending');
    expect(stored?.visitor.vehicle).toEqual({ type: 'bicicleta', brand: 'GW', color: 'Verde', frameSerial: 'GWL458812' });
  });

  it('el token cambia en cada emisión, para que un pase no se reutilice', async () => {
    fillPersonalData();
    api().form.patchValue({ vehicleType: 'scooter', vehicleColor: 'Gris' });
    await api().submit();
    const first = api().pass().token;

    api().registerAnother();
    fillPersonalData();
    api().form.patchValue({ vehicleType: 'scooter', vehicleColor: 'Gris' });
    await api().submit();

    expect(api().pass().token).not.toBe(first);
  });

  it('generar un pase nuevo anula el anterior, para que solo sirva el más reciente', async () => {
    const passes = TestBed.inject(VisitorPassService);
    fillPersonalData();
    api().form.patchValue({ vehicleType: 'scooter', vehicleColor: 'Gris' });
    await api().submit();
    const first = api().pass().token;

    await api().regenerate();

    expect(passes.find(first)?.status).toBe('revoked');
    expect(api().pass().token).not.toBe(first);
    expect(passes.find(api().pass().token)?.status).toBe('pending');
  });
});
