import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { VisitorRegistration } from '../../core/models/visitor-pass';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
import { Visitor } from './visitor';

/** No extiende VisitorApiService (que inyecta HttpClient) para no tener que proveerlo. */
class VisitorApiServiceStub {
  calls: VisitorRegistration[] = [];
  private nextId = 1;
  failNext = false;

  create(visitor: VisitorRegistration): Promise<BackendVisitor> {
    this.calls.push(visitor);

    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('sin conexión'));
    }

    const id = this.nextId++;

    return Promise.resolve({
      id,
      first_name: visitor.firstName,
      last_name: visitor.lastName,
      document_type: visitor.documentType,
      document_number: visitor.documentNumber,
      reason: visitor.reason,
      plate_vehicle_visitor: visitor.vehicle.plate ?? null,
      brand_vehicle: visitor.vehicle.brand ?? '',
      color_vehicle: visitor.vehicle.color ?? '',
      type_vehicle: visitor.vehicle.type,
      model_vehicle: visitor.vehicle.modelYear ?? new Date().getFullYear(),
      created_at: new Date().toISOString(),
    });
  }

  renderQrCode(): Promise<string> {
    return Promise.resolve('data:image/png;base64,stub');
  }
}

describe('Visitor', () => {
  let component: Visitor;
  let fixture: ComponentFixture<Visitor>;
  let backend: VisitorApiServiceStub;

  beforeEach(async () => {
    backend = new VisitorApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [Visitor],
      providers: [provideRouter([]), { provide: VisitorApiService, useValue: backend }],
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
      visitor: () => any;
      qrDataUrl: () => string | null;
      submitError: () => string | null;
      submit: () => Promise<void>;
      onVehicleTypeChange: () => void;
      normalizePlate: () => void;
      normalizeDocumentNumber: () => void;
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

  const chooseType = (type: string) => {
    api().form.controls.vehicleType.setValue(type);
    api().onVehicleTypeChange();
  };

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

  it('la placa solo se pide para moto, con el formato que exige hoy el backend (ABC123)', () => {
    fillPersonalData();
    api().form.patchValue({ vehicleBrand: 'GW', vehicleColor: 'Verde' });

    chooseType('bicicleta');
    expect(api().form.controls.plate.valid).toBe(true);
    expect(api().form.valid).toBe(true);

    chooseType('moto');
    expect(api().form.valid).toBe(false);

    const plate = api().form.controls.plate;
    for (const valid of ['ABC123', 'XYZ987']) {
      plate.setValue(valid);
      expect(plate.valid).toBe(true);
    }
    // El formato antiguo (3 letras, 2 números, 1 letra) ya no lo acepta el backend.
    for (const invalid of ['ABC12D', 'AB123', '123ABC']) {
      plate.setValue(invalid);
      expect(plate.valid).toBe(false);
    }
  });

  it('marca, color y motivo se piden siempre, sin importar el tipo de vehículo', () => {
    fillPersonalData();
    chooseType('scooter');

    expect(api().form.invalid).toBe(true);
    api().form.patchValue({ vehicleBrand: 'Xiaomi', vehicleColor: 'Gris' });
    expect(api().form.valid).toBe(true);
  });

  it('normaliza la placa y el documento mientras se escriben', () => {
    chooseType('moto');
    api().form.controls.plate.setValue('abc-123');
    api().normalizePlate();
    expect(api().form.controls.plate.value).toBe('ABC123');

    api().form.controls.documentNumber.setValue('10.123.456');
    api().normalizeDocumentNumber();
    expect(api().form.controls.documentNumber.value).toBe('10123456');
  });

  it('registrar la visita la envía al backend y muestra el QR con su id (el ingreso lo valida portería)', async () => {
    fillPersonalData();
    chooseType('moto');
    api().form.patchValue({ vehicleBrand: 'Yamaha', vehicleColor: 'Negro', plate: 'ABC123' });

    await api().submit();

    expect(backend.calls).toHaveLength(1);
    expect(backend.calls[0]).toMatchObject({
      firstName: 'Ana María',
      lastName: 'Rodríguez',
      documentType: 'CC',
      documentNumber: '1012345678',
      vehicle: { type: 'moto', brand: 'Yamaha', color: 'Negro', plate: 'ABC123' },
    });

    expect(api().visitor().id).toBe(1);
    expect(api().qrDataUrl()).toContain('data:image');
  });

  it('no envía nada al backend mientras el formulario esté incompleto', async () => {
    await api().submit();

    expect(backend.calls).toHaveLength(0);
    expect(api().visitor()).toBeNull();
  });

  it('si el backend falla, avisa y no muestra ningún código', async () => {
    fillPersonalData();
    chooseType('scooter');
    api().form.patchValue({ vehicleBrand: 'Xiaomi', vehicleColor: 'Gris' });
    backend.failNext = true;

    await api().submit();

    expect(api().visitor()).toBeNull();
    expect(api().submitError()).toContain('No pudimos registrar tu visita');
  });

  it('«Registrar otro visitante» limpia el formulario para la siguiente visita', async () => {
    fillPersonalData();
    chooseType('scooter');
    api().form.patchValue({ vehicleBrand: 'Xiaomi', vehicleColor: 'Gris' });
    await api().submit();

    api().registerAnother();

    expect(api().visitor()).toBeNull();
    expect(api().qrDataUrl()).toBeNull();
    expect(api().form.controls.firstName.value).toBe('');
  });
});
