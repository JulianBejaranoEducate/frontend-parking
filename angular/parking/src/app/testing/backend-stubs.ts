/**
 * Respuestas del backend fabricadas para las pruebas del panel de usuario.
 *
 * Los stubs no extienden los servicios reales (que inyectan HttpClient): solo
 * implementan los métodos que usan las pantallas, con datos controlados.
 */
import type { BackendAccessRecord, BackendOpenRecordsCount, BackendParkingZone } from '../core/services/api/parking-api.service';
import type { BackendUser, BackendUserVehicle } from '../core/services/api/users-api.service';
import { TEST_ACCOUNTS } from './test-session';

const failure = () => Promise.reject(new Error('sin conexión'));

/** Un vehículo de la cuenta de prueba, tal como viaja anidado en `GET /users/:id`. */
export function testUserVehicle(
  plate: string,
  type: string,
  overrides: Partial<BackendUserVehicle> = {},
): BackendUserVehicle {
  return {
    plate,
    brand: 'Yamaha',
    model: 2022,
    color: 'Negro',
    type,
    is_authorized: true,
    id_owner: TEST_ACCOUNTS.user.uid,
    ...overrides,
  };
}

/** La cuenta de prueba del rol `user` como la devuelve `GET /users/:id`. */
export function testUser(vehicles: BackendUserVehicle[] = []): BackendUser {
  return {
    id: TEST_ACCOUNTS.user.uid,
    name: TEST_ACCOUNTS.user.displayName,
    email: TEST_ACCOUNTS.user.email,
    roleId: 1,
    status_user: true,
    vehicles,
  };
}

/** Un registro de acceso de un vehículo de la comunidad (sin visitante). */
export function accessRecord(
  id: number,
  plate: string,
  zoneType: string,
  entryDateTime: string,
  exitDateTime: string | null,
): BackendAccessRecord {
  return { id, plate, visitorId: null, zoneType, entryDateTime, exitDateTime };
}

/** `UsersApiService` de mentira: devuelve {@link user} o falla si {@link fail}. */
export class UsersApiStub {
  user: BackendUser = testUser();
  fail = false;

  findById(_id: string): Promise<BackendUser> {
    return this.fail ? failure() : Promise.resolve(this.user);
  }
}

/** `ParkingApiService` de mentira: tres zonas y el historial que cada prueba defina. */
export class ParkingApiStub {
  zoneRows: BackendParkingZone[] = [
    { id: 1, vehicleType: 'moto', totalCapacity: 60, availableSpaces: 53 },
    { id: 2, vehicleType: 'bicicleta', totalCapacity: 30, availableSpaces: 27 },
    { id: 3, vehicleType: 'scooter', totalCapacity: 20, availableSpaces: 18 },
  ];
  zonesFail = false;
  historyByPlate: Record<string, BackendAccessRecord[]> = {};
  historyFail = false;
  historyCalls: string[] = [];
  openRecordRows: BackendAccessRecord[] = [];
  openRecordsFail = false;

  zones(): Promise<BackendParkingZone[]> {
    return this.zonesFail ? failure() : Promise.resolve(this.zoneRows);
  }

  history(plate: string): Promise<BackendAccessRecord[]> {
    this.historyCalls.push(plate);
    return this.historyFail ? failure() : Promise.resolve(this.historyByPlate[plate] ?? []);
  }

  openRecords(): Promise<BackendAccessRecord[]> {
    return this.openRecordsFail ? failure() : Promise.resolve(this.openRecordRows);
  }

  /** El conteo se calcula de `openRecordRows`, para no repetir la fixture en cada prueba. */
  openRecordsCount(): Promise<BackendOpenRecordsCount> {
    if (this.openRecordsFail) {
      return failure();
    }

    const visitors = this.openRecordRows.filter((record) => record.visitorId !== null).length;
    return Promise.resolve({ institutional: this.openRecordRows.length - visitors, visitors });
  }
}
