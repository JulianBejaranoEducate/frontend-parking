import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { BackendVehicle } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import type { BackendVisitor } from '../../core/services/modules/visitors/visitor-api.service';
import { VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
import { LectorCodigoQr } from '../lector-codigo-qr/lector-codigo-qr';
import { SecurityDashboard } from './security-dashboard';

function backendVisitor(overrides: Partial<BackendVisitor> = {}): BackendVisitor {
  return {
    id: 1,
    first_name: 'Ana María',
    last_name: 'Rodríguez Prueba',
    document_type: 'CC',
    document_number: '1000000001',
    reason: 'Entrega de documentos',
    plate_vehicle_visitor: null,
    brand_vehicle: 'Xiaomi',
    color_vehicle: 'Gris',
    type_vehicle: 'scooter',
    model_vehicle: 2023,
    created_at: '2026-09-15T09:00:00.000Z',
    exited_at: null,
    ...overrides,
  };
}

function backendVehicle(overrides: Partial<BackendVehicle> = {}): BackendVehicle {
  return {
    plate: 'ABC123',
    brand: 'Yamaha',
    model: 2022,
    color: 'Negro',
    type: 'moto',
    is_authorized: true,
    owner: { id_user: 'u1', name_user: 'Julian Bejarano', email_user: 'julian@test.com', role_id_user: '3', status_user: true },
    ...overrides,
  };
}

describe('SecurityDashboard', () => {
  let fixture: ComponentFixture<SecurityDashboard>;
  // Objetos simples (no extienden las clases reales) para no necesitar HttpClient en las pruebas.
  let visitorApi: Pick<VisitorApiService, 'findAll' | 'findById' | 'registerExit' | 'create' | 'renderQrCode'>;
  let vehicleApi: Pick<VehicleApiService, 'inside' | 'outside' | 'findByPlate' | 'authorize' | 'registerExit'>;

  const create = async (section = 'resumen') => {
    await TestBed.configureTestingModule({
      imports: [SecurityDashboard],
      providers: [
        { provide: VisitorApiService, useValue: visitorApi },
        { provide: VehicleApiService, useValue: vehicleApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityDashboard);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const click = async (label: string) => {
    const button = [...host().querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    button?.click();
    await fixture.whenStable();
  };
  const reader = () => fixture.debugElement.query(By.directive(LectorCodigoQr)).componentInstance as LectorCodigoQr;
  const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    visitorApi = {
      findAll: () => Promise.resolve([]),
      findById: () => Promise.reject(new Error('no encontrado')),
      registerExit: () => Promise.reject(new Error('no implementado en la prueba')),
      create: () => Promise.reject(new Error('no implementado en la prueba')),
      renderQrCode: () => Promise.resolve('data:image/png;base64,stub'),
    };
    vehicleApi = {
      inside: () => Promise.resolve([]),
      outside: () => Promise.resolve([]),
      findByPlate: () => Promise.resolve(null),
      authorize: () => Promise.reject(new Error('no implementado en la prueba')),
      registerExit: () => Promise.reject(new Error('no implementado en la prueba')),
    };
  });

  describe('resumen', () => {
    it('combina visitantes y vehículos institucionales que están dentro, de verdad', async () => {
      visitorApi.findAll = () =>
        Promise.resolve([
          backendVisitor({ id: 1, exited_at: null }),
          backendVisitor({ id: 2, first_name: 'Luisa', last_name: 'Guerrero', exited_at: '2026-09-15T10:00:00.000Z' }),
        ]);
      vehicleApi.inside = () => Promise.resolve([backendVehicle({ plate: 'KZT45F' })]);

      await create('resumen');

      expect(text('.tile__value')).toBe('2');
      expect(text('.tile__note')).toContain('1 de la comunidad');
      expect(text('.tile__note')).toContain('1 visitantes');
      // La visitante que ya salió no aparece en "dentro ahora".
      expect(host().querySelectorAll('.stay')).toHaveLength(2);
      expect(text('#inside-title')).not.toContain('Luisa');
    });

    it('sin nadie dentro, lo dice claramente', async () => {
      await create('resumen');
      expect(text('.empty')).toContain('No hay nadie dentro');
    });

    it('si el backend no responde, avisa en vez de mostrar una lista vacía engañosa', async () => {
      visitorApi.findAll = () => Promise.reject(new Error('sin conexión'));

      await create('resumen');

      expect(text('.notice--critical')).toContain('No pudimos consultar el backend');
    });
  });

  describe('control de acceso', () => {
    it('un código numérico se busca como visitante', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));

      await create('control');
      reader().read.emit('7');
      await flushAsync();
      await fixture.whenStable();

      expect(text('#result-title')).toContain('Ana María Rodríguez Prueba');
      expect(text('#result-title')).toContain('Dentro');
    });

    it('confirma la salida de un visitante y no ofrece otra acción', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));
      let exitCalledWith: number | null = null;
      visitorApi.registerExit = (id) => {
        exitCalledWith = id;
        return Promise.resolve(backendVisitor({ id, exited_at: '2026-09-15T11:00:00.000Z' }));
      };

      await create('control');
      reader().read.emit('3');
      await flushAsync();
      await fixture.whenStable();

      await click('Marcar salida');

      expect(exitCalledWith).toBe(3);
      expect(text('#result-title')).toContain('Ya salió');
      expect(text('.flash')).toContain('Salida registrada');
      expect([...host().querySelectorAll('button')].some((b) => b.textContent?.includes('Marcar salida'))).toBe(false);
    });

    it('un código no numérico se busca como placa; si está afuera, ofrece registrar el ingreso', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve({ vehicle: backendVehicle({ plate, is_authorized: false }), inside: false });
      let authorizedPlate: string | null = null;
      vehicleApi.authorize = (plate) => {
        authorizedPlate = plate;
        return Promise.resolve();
      };

      await create('control');
      reader().read.emit('xyz789');
      await flushAsync();
      await fixture.whenStable();

      expect(text('#result-title')).toContain('XYZ789');
      expect(text('#result-title')).toContain('Afuera');
      expect(text('.facts')).toContain('Julian Bejarano');

      await click('Registrar ingreso');

      expect(authorizedPlate).toBe('XYZ789');
      expect(text('#result-title')).toContain('Dentro');
      expect(text('.flash')).toContain('Ingreso registrado');
    });

    it('un vehículo que ya está dentro ofrece registrar la salida', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve({ vehicle: backendVehicle({ plate, is_authorized: true }), inside: true });
      vehicleApi.registerExit = () => Promise.resolve();

      await create('control');
      reader().read.emit('ABC123');
      await flushAsync();
      await fixture.whenStable();

      await click('Registrar salida');

      expect(text('#result-title')).toContain('Afuera');
      expect(text('.flash')).toContain('Salida registrada');
    });

    it('un código que no corresponde a nada muestra el error y no abre ninguna tarjeta', async () => {
      await create('control');
      reader().read.emit('9999');
      await flushAsync();
      await fixture.whenStable();

      expect(text('.notice--critical')).toContain('no corresponde a ningún visitante ni a ningún vehículo');
      expect(host().querySelector('#result-title')).toBeNull();
    });

    it('la búsqueda manual funciona igual que el escáner, para cuando no hay cámara', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve({ vehicle: backendVehicle({ plate }), inside: true });

      await create('control');
      const input = host().querySelector<HTMLInputElement>('#manual-code')!;
      input.value = 'abc123';
      input.dispatchEvent(new Event('input'));
      host().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await flushAsync();
      await fixture.whenStable();

      expect(text('#result-title')).toContain('ABC123');
    });

    it('«Cerrar» descarta la tarjeta', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));

      await create('control');
      reader().read.emit('1');
      await flushAsync();
      await fixture.whenStable();
      await click('Cerrar');

      expect(host().querySelector('#result-title')).toBeNull();
    });
  });
});
