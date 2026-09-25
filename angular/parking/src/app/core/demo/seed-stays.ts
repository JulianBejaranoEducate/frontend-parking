/**
 * Estancias de ejemplo para el modo demostración. Personas, placas y pases
 * son ficticios.
 *
 * Arman una mañana normal en portería:
 * - Julian (el estudiante de la demostración) con su moto dentro y su historial.
 * - Vehículos aprobados de la comunidad, dentro o que ya salieron hoy.
 * - Una moto que entró ayer y sigue dentro, para la alerta de estancia larga.
 * - Dos visitantes que entraron con su pase QR.
 *
 * Los ingresos de hoy los registró Carlos en su turno; los de ayer, Diana
 * (ver seed-shifts.ts).
 */
import { zoneFor } from '../config/parking.config';
import type { IdentificationMethod, MovementAudit, ParkingStay, StaySubject } from '../models/parking';
import type { Vehicle } from '../models/vehicle';
import { declaredFullName, type VehicleRegistration } from '../models/vehicle-registration';
import { DEMO_ACCOUNTS } from '../services/auth.service';
import { daysAgoAt, minutesAgo } from './demo-time';
import { DEMO_SHIFT_IDS } from './seed-shifts';
import { DEMO_STUDENT_UID, seedRegistrations } from './seed-registrations';

const CARLOS = DEMO_ACCOUNTS.security;
const DIANA = DEMO_ACCOUNTS['security-relief'];

/** Auditoría de un movimiento registrado por un guardia de la demostración. */
function by(
  guard: typeof CARLOS,
  method: IdentificationMethod,
  shiftId: string | null,
): MovementAudit {
  return { guardUid: guard.uid, guardName: guard.displayName, shiftId, method };
}

/** Estancia de un vehículo de la comunidad a partir de su registro aprobado. */
function institutional(
  id: string,
  registration: VehicleRegistration,
  enteredAt: Date,
  exitedAt: Date | null,
  entry: MovementAudit,
  exit: MovementAudit | null = null,
): ParkingStay {
  const subject: StaySubject = {
    kind: 'institutional',
    uid: registration.applicant.uid,
    registrationId: registration.id,
    fullName: declaredFullName(registration.owner),
    documentNumber: registration.owner.documentNumber,
  };

  return {
    id,
    vehicle: registration.vehicle,
    zoneName: zoneFor(registration.vehicle.type).name,
    enteredAt,
    exitedAt,
    subject,
    entry,
    exit,
  };
}

/** Estancia de un visitante que ingresó con su pase QR. */
function visitor(
  id: string,
  person: { fullName: string; documentNumber: string; reason: string; passToken: string },
  vehicle: Vehicle,
  enteredAt: Date,
  entry: MovementAudit,
): ParkingStay {
  return {
    id,
    vehicle,
    zoneName: zoneFor(vehicle.type).name,
    enteredAt,
    exitedAt: null,
    subject: { kind: 'visitor', ...person },
    entry,
    exit: null,
  };
}

export function seedStays(): ParkingStay[] {
  const registrations = new Map(seedRegistrations().map((registration) => [registration.id, registration]));
  const reg = (id: string): VehicleRegistration => registrations.get(id)!;

  const today = DEMO_SHIFT_IDS.today;
  const yesterday = DEMO_SHIFT_IDS.yesterday;
  const carlosPlate = by(CARLOS, 'plate-photo', today);
  const carlosDocument = by(CARLOS, 'document', today);

  // Historial de Julian: su moto actual y la que ya eliminó de "Mis vehículos".
  const kzt45f = reg('reg-kzt45f');
  const previousMoto: VehicleRegistration = {
    ...kzt45f,
    id: 'reg-hbq82c-eliminada',
    vehicle: { type: 'moto', brand: 'AKT', line: 'NKD 125', color: 'Rojo', plate: 'HBQ82C' },
  };
  const julianHistory = (
    id: string,
    registration: VehicleRegistration,
    daysAgo: number,
    [inHour, inMinute]: [number, number],
    [outHour, outMinute]: [number, number],
  ): ParkingStay => ({
    ...institutional(
      id,
      registration,
      daysAgoAt(daysAgo, inHour, inMinute),
      daysAgoAt(daysAgo, outHour, outMinute),
      by(CARLOS, 'plate-photo', null),
      by(DIANA, 'plate-photo', null),
    ),
    // La moto eliminada ya no tiene registro al que apuntar.
    subject: {
      kind: 'institutional',
      uid: DEMO_STUDENT_UID,
      registrationId: registration === previousMoto ? null : registration.id,
      fullName: declaredFullName(registration.owner),
      documentNumber: registration.owner.documentNumber,
    },
  });

  return [
    // ---- Dentro ahora ----------------------------------------------------------------------
    institutional('s-01', kzt45f, minutesAgo(96), null, carlosPlate),
    institutional('s-natalia', reg('reg-hgt52b'), minutesAgo(150), null, carlosPlate),
    institutional('s-felipe', reg('reg-lmn38e'), minutesAgo(120), null, carlosPlate),
    institutional('s-paula', reg('reg-wxy19h'), minutesAgo(75), null, carlosPlate),
    institutional('s-esteban', reg('reg-bcd82m'), minutesAgo(35), null, carlosPlate),
    // Entró ayer por la tarde y no ha salido: alerta de estancia larga.
    institutional('s-juliana', reg('reg-pqr71c'), daysAgoAt(1, 18, 40), null, by(DIANA, 'plate-photo', yesterday)),
    institutional('s-sebastian', reg('reg-trek'), minutesAgo(200), null, carlosDocument),
    institutional('s-mariana', reg('reg-gw-lynx'), minutesAgo(110), null, carlosDocument),
    institutional('s-tomas', reg('reg-scooter-tomas'), minutesAgo(160), null, carlosDocument),
    institutional('s-sara', reg('reg-scooter-sara'), minutesAgo(55), null, carlosDocument),
    visitor(
      's-visita-martin',
      {
        fullName: 'Martín Acosta Bernal',
        documentNumber: '1098765432',
        reason: 'Reunión en Admisiones',
        passToken: 'demo-pass-martin',
      },
      { type: 'moto', plate: 'UYT43G', brand: 'Honda', color: 'Negro' },
      minutesAgo(40),
      by(CARLOS, 'qr', today),
    ),
    visitor(
      's-visita-luisa',
      {
        fullName: 'Luisa Guerrero Paz',
        documentNumber: '1122334455',
        reason: 'Evento de egresados',
        passToken: 'demo-pass-luisa',
      },
      { type: 'bicicleta', brand: 'Scott', color: 'Blanco' },
      minutesAgo(25),
      by(CARLOS, 'qr', today),
    ),

    // ---- Salieron hoy ----------------------------------------------------------------------
    institutional('s-diego', reg('reg-stv64k'), minutesAgo(240), minutesAgo(90), carlosPlate, carlosPlate),
    institutional(
      's-andrea',
      reg('reg-rockhopper'),
      minutesAgo(210),
      minutesAgo(130),
      carlosDocument,
      carlosDocument,
    ),

    // ---- Historial de Julian -----------------------------------------------------------------
    julianHistory('s-02', kzt45f, 1, [7, 10], [16, 5]),
    julianHistory('s-03', kzt45f, 2, [8, 0], [12, 30]),
    julianHistory('s-04', kzt45f, 4, [6, 45], [11, 0]),
    julianHistory('s-05', kzt45f, 6, [9, 15], [17, 40]),
    julianHistory('s-06', kzt45f, 9, [7, 30], [13, 10]),
    julianHistory('s-07', kzt45f, 12, [10, 0], [15, 20]),
    julianHistory('s-08', kzt45f, 16, [7, 5], [12, 45]),
    julianHistory('s-09', previousMoto, 20, [8, 20], [14, 0]),
    julianHistory('s-10', previousMoto, 24, [6, 50], [11, 35]),
    julianHistory('s-11', previousMoto, 28, [9, 40], [18, 10]),
  ];
}
