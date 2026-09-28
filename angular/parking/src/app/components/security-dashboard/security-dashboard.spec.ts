import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  type BackendAccessRecord,
  type BackendParkingZone,
  ParkingApiService,
} from '../../core/services/modules/security-dashboard/parking-api.service';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
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
    plate_vehicle_visitor: '',
    brand_vehicle: 'Xiaomi',
    color_vehicle: 'Gris',
    type_vehicle: 'scooter',
    model_vehicle: 2023,
    created_at: '2026-09-27T09:00:00.000Z',
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
    id_owner: 'u1',
    owner: { id: 'u1', name: 'Julian Bejarano', email: 'julian@test.com', roleId: 3, status_user: true },
    ...overrides,
  };
}

function accessRecord(overrides: Partial<BackendAccessRecord> = {}): BackendAccessRecord {
  return {
    id: 1,
    plate: null,
    visitorId: 1,
    zoneType: 'scooter',
    entryDateTime: '2026-09-27T10:00:00.000Z',
    exitDateTime: null,
    ...overrides,
  };
}

function zone(id: number, vehicleType: string, totalCapacity: number, availableSpaces: number): BackendParkingZone {
  return { id, vehicleType, totalCapacity, availableSpaces };
}

function rejection(details: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: 500, error: { error: 'Error al registrar el ingreso', details } });
}

describe('SecurityDashboard', () => {
  let fixture: ComponentFixture<SecurityDashboard>;
  // Objetos simples (no extienden las clases reales) para no necesitar HttpClient en las pruebas.
  let visitorApi: Pick<VisitorApiService, 'findAll' | 'findById' | 'findLatestByDocument' | 'findLatestByPlate'>;
  let vehicleApi: Pick<VehicleApiService, 'authorized' | 'findByPlate'>;
  let parkingApi: Pick<
    ParkingApiService,
    'zones' | 'openRecords' | 'registerVisitorEntry' | 'registerVisitorExit' | 'registerVehicleEntry' | 'registerVehicleExit'
  >;
  let calls: string[];

  const create = async (section = 'resumen') => {
    await TestBed.configureTestingModule({
      imports: [SecurityDashboard],
      providers: [
        { provide: VisitorApiService, useValue: visitorApi },
        { provide: VehicleApiService, useValue: vehicleApi },
        { provide: ParkingApiService, useValue: parkingApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityDashboard);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const texts = (selector: string) =>
    [...host().querySelectorAll(selector)].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());
  const buttons = () => [...host().querySelectorAll<HTMLButtonElement>('button')].map((button) => button.textContent?.trim());
  const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));
  const click = async (label: string) => {
    const button = [...host().querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    button?.click();
    await flushAsync();
    await fixture.whenStable();
  };
  const scan = async (code: string) => {
    (fixture.debugElement.query(By.directive(LectorCodigoQr)).componentInstance as LectorCodigoQr).read.emit(code);
    await flushAsync();
    await fixture.whenStable();
  };

  beforeEach(() => {
    calls = [];
    visitorApi = {
      findAll: () => Promise.resolve([]),
      findById: () => Promise.reject(new Error('no encontrado')),
      findLatestByDocument: () => Promise.resolve(null),
      findLatestByPlate: () => Promise.resolve(null),
    };
    vehicleApi = {
      authorized: () => Promise.resolve([]),
      findByPlate: () => Promise.resolve(null),
    };
    parkingApi = {
      zones: () => {
        calls.push('zones');
        return Promise.resolve([]);
      },
      openRecords: () => {
        calls.push('openRecords');
        return Promise.resolve([]);
      },
      registerVisitorEntry: (id) => {
        calls.push(`entrada visitante ${id}`);
        return Promise.resolve(accessRecord({ visitorId: id }));
      },
      registerVisitorExit: (id) => {
        calls.push(`salida visitante ${id}`);
        return Promise.resolve(accessRecord({ visitorId: id, exitDateTime: '2026-09-27T12:00:00.000Z' }));
      },
      registerVehicleEntry: (plate) => {
        calls.push(`entrada vehículo ${plate}`);
        return Promise.resolve(accessRecord({ plate, visitorId: null, zoneType: 'moto' }));
      },
      registerVehicleExit: (plate) => {
        calls.push(`salida vehículo ${plate}`);
        return Promise.resolve(
          accessRecord({ plate, visitorId: null, zoneType: 'moto', exitDateTime: '2026-09-27T12:00:00.000Z' }),
        );
      },
    };
  });

  describe('resumen', () => {
    /** La placa o el tipo de vehículo de cada fila, sin la etiqueta «Visitante». */
    const stayTitles = () => texts('.movement__title > span:first-child');
    const insideMessage = () => text('section[aria-labelledby="inside-title"] .empty');
    const selectOption = async (id: string, value: string) => {
      const select = host().querySelector<HTMLSelectElement>(`#${id}`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const typeInto = async (id: string, value: string) => {
      const input = host().querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    /** Visitantes dentro, cada uno con su registro abierto; el primero entró primero. */
    const visitorsInside = (people: Partial<BackendVisitor>[]) => {
      const visitors = people.map((person, index) => backendVisitor({ id: index + 1, ...person }));
      visitorApi.findAll = () => Promise.resolve(visitors);
      parkingApi.openRecords = () =>
        Promise.resolve(
          visitors.map((visitor, index) =>
            accessRecord({
              id: index + 1,
              visitorId: visitor.id,
              plate: visitor.plate_vehicle_visitor || null,
              zoneType: visitor.type_vehicle,
              entryDateTime: `2026-09-27T12:${String(index).padStart(2, '0')}:00.000Z`,
            }),
          ),
        );
    };

    it('muestra los puestos disponibles y la ocupación real de cada zona', async () => {
      // El backend no garantiza el orden: se muestran por id (motos, bicicletas, scooters).
      parkingApi.zones = () =>
        Promise.resolve([zone(3, 'scooter', 10, 8), zone(1, 'moto', 50, 43), zone(2, 'bicicleta', 20, 17)]);

      await create('resumen');

      expect(texts('.tile__value')).toEqual(['0', '68']);
      expect(texts('.tile__note')).toEqual(['0 de la comunidad · 0 visitantes', 'de 80 · 12 en uso']);
      expect(texts('.zone__name')).toEqual(['Zona de motos', 'Zona de bicicletas', 'Zona de scooters']);
      expect(text('.zone')).toContain('43 libres de 50');
      expect(text('.zone')).toContain('7 en uso');
    });

    it('«Dentro ahora» son los registros abiertos, con el nombre del visitante o del dueño', async () => {
      parkingApi.openRecords = () =>
        Promise.resolve([
          accessRecord({ id: 5, visitorId: null, plate: 'HGT52B', zoneType: 'moto', entryDateTime: '2026-09-27T19:00:00.000Z' }),
          accessRecord({ id: 6, visitorId: 7, zoneType: 'bicicleta', entryDateTime: '2026-09-27T19:08:00.000Z' }),
        ]);
      visitorApi.findAll = () =>
        Promise.resolve([backendVisitor({ id: 7, first_name: 'Jeisson', last_name: 'Farfán', type_vehicle: 'bicicleta' })]);
      vehicleApi.authorized = () =>
        Promise.resolve([
          backendVehicle({
            plate: 'HGT52B',
            owner: { id: 'u2', name: 'Natalia Suárez', email: 'natalia@test.com', roleId: 3, status_user: true },
          }),
        ]);

      await create('resumen');

      expect(texts('.tile__value')[0]).toBe('2');
      expect(texts('.tile__note')[0]).toBe('1 de la comunidad · 1 visitante');
      // El ingreso más reciente va primero; solo el visitante lleva la etiqueta.
      expect(stayTitles()).toEqual(['Bicicleta', 'HGT52B']);
      expect(host().querySelectorAll('.stay .chip')).toHaveLength(1);
      expect(texts('.movement__meta')).toContain('Bicicleta · Jeisson Farfán');
      expect(texts('.movement__meta')).toContain('Moto · Natalia Suárez');
    });

    it('la búsqueda (placa, documento o nombre) se combina con los filtros de quién y de vehículo', async () => {
      visitorsInside([
        { first_name: 'Ana', last_name: 'Gómez', document_number: '1122334455', type_vehicle: 'moto', plate_vehicle_visitor: 'JKL908' },
        { first_name: 'Beto', last_name: 'Ríos', document_number: '9988776655', type_vehicle: 'scooter' },
      ]);

      await create('resumen');
      expect(host().querySelectorAll('.stay')).toHaveLength(2);

      await typeInto('search-filter', 'ana');
      expect(stayTitles()).toEqual(['JKL908']);

      await typeInto('search-filter', '9988776655');
      expect(texts('.movement__meta')).toContain('Scooter · Beto Ríos');

      await typeInto('search-filter', 'jkl908');
      expect(host().querySelectorAll('.stay')).toHaveLength(1);

      await selectOption('vehicle-type-filter', 'scooter');
      expect(host().querySelectorAll('.stay')).toHaveLength(0);
      expect(insideMessage()).toContain('Nadie dentro ahora mismo cumple estos filtros');

      await typeInto('search-filter', '');
      await selectOption('owner-filter', 'institucional');
      expect(insideMessage()).toContain('Nadie dentro ahora mismo cumple estos filtros');
    });

    it('muestra máximo siete por página y deja avanzar a la siguiente', async () => {
      visitorsInside(Array.from({ length: 9 }, (_, index) => ({ first_name: `Visitante${index + 1}` })));

      await create('resumen');

      expect(host().querySelectorAll('.stay')).toHaveLength(7);
      expect(text('.pagination__label')).toBe('Página 1 de 2');
      // El último en entrar va primero.
      expect(texts('.movement__meta')[0]).toContain('Visitante9');

      await click('Siguiente');

      expect(host().querySelectorAll('.stay')).toHaveLength(2);
      expect(text('.pagination__label')).toBe('Página 2 de 2');
    });

    it('sin nadie dentro, lo dice claramente', async () => {
      await create('resumen');

      expect(insideMessage()).toContain('No hay nadie dentro en este momento');
    });

    it('si el backend no responde, lo avisa y no muestra cifras', async () => {
      parkingApi.zones = () => Promise.reject(new Error('sin conexión'));
      parkingApi.openRecords = () => Promise.reject(new Error('sin conexión'));

      await create('resumen');

      expect(text('.notice--critical')).toContain('No pudimos consultar');
      expect(host().querySelector('.tile')).toBeNull();
    });

    it('«Actualizar» vuelve a consultar la ocupación y quién está dentro', async () => {
      await create('resumen');
      await click('Actualizar');

      expect(calls.filter((call) => call === 'zones')).toHaveLength(2);
      expect(calls.filter((call) => call === 'openRecords')).toHaveLength(2);
    });
  });

  describe('control de acceso: visitantes', () => {
    it('el QR lleva el id del visitante y muestra sus datos con las dos acciones', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));

      await create('control');
      await scan('7');

      expect(text('#result-title')).toContain('Ana María Rodríguez Prueba');
      expect(text('.facts')).toContain('CC 1000000001');
      expect(buttons()).toEqual(expect.arrayContaining(['Registrar ingreso', 'Registrar salida']));
    });

    it('registrar el ingreso abre su registro de acceso y actualiza la ocupación', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));

      await create('control');
      await scan('7');
      await click('Registrar ingreso');

      expect(calls).toContain('entrada visitante 7');
      expect(text('#result-title')).toContain('Dentro');
      expect(text('.facts')).toContain('Ingreso');
      expect(text('.flash')).toContain('Ingreso registrado: Ana María Rodríguez Prueba');
      expect(buttons()).not.toContain('Registrar ingreso');
      expect(buttons()).not.toContain('Registrar salida');
      expect(calls.filter((call) => call === 'zones')).toHaveLength(2);
    });

    it('registrar la salida cierra su registro de acceso', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));

      await create('control');
      await scan('7');
      await click('Registrar salida');

      expect(calls).toContain('salida visitante 7');
      expect(text('#result-title')).toContain('Salió');
      expect(text('.flash')).toContain('Salida registrada');
    });

    it('si el backend rechaza el movimiento, muestra su motivo y deja las acciones', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));
      parkingApi.registerVisitorEntry = () => Promise.reject(rejection('El visitante ya se encuentra dentro del parqueadero'));

      await create('control');
      await scan('7');
      await click('Registrar ingreso');

      expect(text('.notice--critical')).toBe('El visitante ya se encuentra dentro del parqueadero');
      expect(buttons()).toContain('Registrar salida');
    });

    it('no envía dos veces el mismo movimiento si se pulsa de nuevo mientras responde el backend', async () => {
      visitorApi.findById = (id) => Promise.resolve(backendVisitor({ id }));
      let answer: (record: BackendAccessRecord) => void = () => undefined;
      parkingApi.registerVisitorEntry = (id) => {
        calls.push(`entrada visitante ${id}`);
        return new Promise((resolve) => (answer = resolve));
      };

      await create('control');
      await scan('7');
      const entry = [...host().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Registrar ingreso'))!;
      entry.click();
      entry.click();
      answer(accessRecord());
      await flushAsync();

      expect(calls.filter((call) => call.startsWith('entrada'))).toHaveLength(1);
    });

    it('sin el QR, lo encuentra por documento (su registro más reciente)', async () => {
      visitorApi.findLatestByDocument = (document) =>
        Promise.resolve(document === '1122334455' ? backendVisitor({ id: 4, first_name: 'Luisa', last_name: 'Guerrero Paz' }) : null);

      await create('control');
      await scan('1122334455');

      expect(text('#result-title')).toContain('Luisa Guerrero Paz');
    });

    it('sin el QR, también lo encuentra por la placa de su moto', async () => {
      visitorApi.findLatestByPlate = (plate) =>
        Promise.resolve(plate === 'JKL908' ? backendVisitor({ id: 3, first_name: 'Andrés', plate_vehicle_visitor: 'JKL908' }) : null);

      await create('control');
      await scan('jkl908');

      expect(text('#result-title')).toContain('Andrés');
      expect(text('.facts')).toContain('JKL908');
    });
  });

  describe('control de acceso: comunidad', () => {
    it('la placa de un vehículo autorizado permite registrar su ingreso', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve(backendVehicle({ plate }));

      await create('control');
      await scan('abc123');

      expect(text('#result-title')).toContain('ABC123');
      expect(text('#result-title')).toContain('Autorizado');
      expect(text('.facts')).toContain('Julian Bejarano');

      await click('Registrar ingreso');

      expect(calls).toContain('entrada vehículo ABC123');
      expect(text('#result-title')).toContain('Dentro');
    });

    it('un vehículo sin autorización no puede entrar, pero sí se le puede registrar la salida', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve(backendVehicle({ plate, is_authorized: false }));

      await create('control');
      await scan('ABC123');

      expect(text('#result-title')).toContain('Sin autorización');
      expect(text('.notice--warning')).toContain('no le ha dado permiso para entrar');
      expect(buttons()).not.toContain('Registrar ingreso');

      await click('Registrar salida');

      expect(calls).toContain('salida vehículo ABC123');
    });

    it('si el backend no cargó al dueño, lo dice en vez de dejar el dato vacío', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve(backendVehicle({ plate, owner: undefined }));

      await create('control');
      await scan('ABC123');

      expect(text('.facts')).toContain('Dueño no disponible');
    });
  });

  describe('control de acceso: búsqueda', () => {
    it('un código que no corresponde a nada muestra el error y no abre ninguna tarjeta', async () => {
      await create('control');
      await scan('9999');

      expect(text('.notice--critical')).toContain('no corresponde a ningún visitante ni a ningún vehículo');
      expect(host().querySelector('#result-title')).toBeNull();
    });

    it('la búsqueda manual funciona igual que el escáner, para cuando no hay cámara', async () => {
      vehicleApi.findByPlate = (plate) => Promise.resolve(backendVehicle({ plate }));

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
      await scan('1');
      await click('Cerrar');

      expect(host().querySelector('#result-title')).toBeNull();
    });
  });
});
