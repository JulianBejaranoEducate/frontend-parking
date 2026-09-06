import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      submit: () => Promise<void>;
      normalizePlate: () => void;
      normalizeDocumentNumber: () => void;
      registerAnother: () => void;
    };

  const fillValidForm = () =>
    api().form.setValue({
      firstName: 'Ana María',
      lastName: 'Rodríguez',
      documentType: 'CC',
      documentNumber: '1012345678',
      plate: 'ABC123',
      reason: 'Reunión con admisiones',
    });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pide los seis datos del visitante', () => {
    expect(Object.keys(api().form.controls)).toEqual([
      'firstName',
      'lastName',
      'documentType',
      'documentNumber',
      'plate',
      'reason',
    ]);
    expect(api().form.invalid).toBe(true);
  });

  it('acepta placas de automóvil y de motocicleta, y rechaza formatos inválidos', () => {
    const plate = api().form.controls.plate;

    for (const valid of ['ABC123', 'ABC12D']) {
      plate.setValue(valid);
      expect(plate.valid).toBe(true);
    }

    for (const invalid of ['AB123', 'ABCD12', '123ABC', 'ABC1234']) {
      plate.setValue(invalid);
      expect(plate.valid).toBe(false);
    }
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

  it('normaliza la placa y el número de documento mientras se escriben', () => {
    api().form.controls.plate.setValue('abc-123');
    api().normalizePlate();
    expect(api().form.controls.plate.value).toBe('ABC123');

    api().form.controls.documentNumber.setValue('10.123.456');
    api().normalizeDocumentNumber();
    expect(api().form.controls.documentNumber.value).toBe('10123456');
  });

  it('no emite ningún pase mientras el formulario esté incompleto', async () => {
    await api().submit();

    expect(api().pass()).toBeNull();
  });

  it('emite un pase con token único y vigencia al enviar datos válidos', async () => {
    fillValidForm();
    await api().submit();

    const pass = api().pass();

    expect(pass).not.toBeNull();
    expect(pass.token).toMatch(/[0-9a-f-]{16,}/);
    expect(pass.status).toBe('pending');
    expect(pass.expiresAt.getTime()).toBeGreaterThan(pass.issuedAt.getTime());
    expect(api().qrDataUrl()).toContain('data:image');
  });

  it('el token cambia en cada emisión, para que un pase no se reutilice', async () => {
    fillValidForm();
    await api().submit();
    const first = api().pass().token;

    api().registerAnother();
    fillValidForm();
    await api().submit();

    expect(api().pass().token).not.toBe(first);
  });
});
