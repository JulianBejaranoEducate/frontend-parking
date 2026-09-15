/**
 * Turnos del personal de seguridad (ADR-009 en planeacion-desarrollo.md).
 *
 * Cada guardia tiene su propia cuenta. Un turno empieza cuando el guardia lo
 * toma (o recibe el del compañero anterior) y termina cuando lo entrega. Sin
 * turno activo no se registran ingresos ni salidas, así cada movimiento queda a
 * nombre de quien lo autorizó.
 */
import type { VehicleType } from './vehicle';

/** Resumen que deja el guardia al entregar el turno. */
export interface ShiftHandover {
  at: Date;
  /** Vehículos dentro por tipo en el momento de entregar. */
  insideByType: Record<VehicleType, number>;
  /** Ingresos registrados durante el turno. */
  entries: number;
  /** Salidas registradas durante el turno. */
  exits: number;
  /** Incidencias sin resolver al entregar. */
  openIncidents: number;
  /** Observaciones para quien recibe. */
  notes: string;
  /** true cuando no hay relevo: el turno cierra la jornada. */
  closesDay: boolean;
}

/** Confirmación del guardia que recibe un turno entregado. */
export interface ShiftReception {
  at: Date;
  guardUid: string;
  guardName: string;
  /** El conteo físico del parqueadero coincidió con el del sistema. */
  countMatches: boolean;
  /** Obligatorio cuando el conteo no coincide. */
  notes: string;
  /** Incidencia creada cuando el conteo no coincidió. */
  incidentId: string | null;
}

export interface SecurityShift {
  id: string;
  /** Portería donde se trabajó el turno. */
  post: string;
  guardUid: string;
  guardName: string;
  startedAt: Date;
  /** Turno que se recibió al empezar este; null si empezó sin relevo. */
  receivedFromShiftId: string | null;
  /** null mientras el turno siga en curso. */
  handover: ShiftHandover | null;
  /** Quién recibió este turno; null si no se ha recibido o si cerró la jornada. */
  reception: ShiftReception | null;
}

/**
 * - active: en curso.
 * - awaiting-reception: entregado, esperando al relevo.
 * - received: entregado y recibido por otro guardia.
 * - closed: entregado cerrando la jornada, sin relevo.
 */
export type ShiftStatus = 'active' | 'awaiting-reception' | 'received' | 'closed';

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  active: 'En curso',
  'awaiting-reception': 'Por recibir',
  received: 'Recibido',
  closed: 'Jornada cerrada',
};

/** Estado de un turno a partir de su entrega y su recepción. */
export function shiftStatus(shift: SecurityShift): ShiftStatus {
  if (!shift.handover) {
    return 'active';
  }

  if (shift.handover.closesDay) {
    return 'closed';
  }

  return shift.reception ? 'received' : 'awaiting-reception';
}

/** Total de vehículos dentro según un resumen de entrega. */
export function totalInside(insideByType: Record<VehicleType, number>): number {
  return Object.values(insideByType).reduce((total, count) => total + count, 0);
}
