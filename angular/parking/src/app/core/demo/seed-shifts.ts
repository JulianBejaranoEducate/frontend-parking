/**
 * Turnos de ejemplo para el modo demostración (ADR-009).
 *
 * Diana trabajó ayer por la tarde y entregó el turno dejando una moto dentro.
 * Carlos lo recibió esta mañana y su turno sigue en curso. Así, al entrar como
 * Carlos se puede entregar el turno, y al entrar como Diana, recibirlo.
 */
import { PARKING } from '../config/parking.config';
import type { SecurityShift } from '../models/shift';
import { DEMO_ACCOUNTS } from '../services/auth.service';
import { daysAgoAt, minutesAgo } from './demo-time';

/** Ids fijos para que las estancias de ejemplo apunten a su turno. */
export const DEMO_SHIFT_IDS = {
  yesterday: 'shift-diana-ayer',
  today: 'shift-carlos-hoy',
} as const;

export function seedShifts(): SecurityShift[] {
  const carlos = DEMO_ACCOUNTS.security;
  const diana = DEMO_ACCOUNTS['security-relief'];
  const carlosStartedAt = minutesAgo(300);

  return [
    {
      id: DEMO_SHIFT_IDS.yesterday,
      post: PARKING.postName,
      guardUid: diana.uid,
      guardName: diana.displayName,
      startedAt: daysAgoAt(1, 14, 0),
      receivedFromShiftId: null,
      handover: {
        at: daysAgoAt(1, 22, 0),
        insideByType: { moto: 1, bicicleta: 0, scooter: 0 },
        entries: 9,
        exits: 14,
        openIncidents: 2,
        notes: 'Queda la moto PQR71C dentro: la propietaria avisó que la recoge mañana.',
        closesDay: false,
      },
      reception: {
        at: carlosStartedAt,
        guardUid: carlos.uid,
        guardName: carlos.displayName,
        countMatches: true,
        notes: '',
        incidentId: null,
      },
    },
    {
      id: DEMO_SHIFT_IDS.today,
      post: PARKING.postName,
      guardUid: carlos.uid,
      guardName: carlos.displayName,
      startedAt: carlosStartedAt,
      receivedFromShiftId: DEMO_SHIFT_IDS.yesterday,
      handover: null,
      reception: null,
    },
  ];
}
