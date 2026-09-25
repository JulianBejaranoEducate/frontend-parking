/**
 * Modelo del pase de visitante.
 *
 * Decisión de diseño importante: el QR NO lleva dentro los datos personales,
 * solo un token opaco. Así una foto del código no filtra nombre, documento ni
 * motivo, y el detalle solo aparece cuando el personal de seguridad resuelve
 * ese token contra el sistema.
 */
import type { Vehicle } from './vehicle';

// La taxonomía de vehículos vive en ./vehicle porque el dashboard de usuarios
// también la necesita; se reexporta para no romper a quien ya la importa de aquí.
export {
  NO_VEHICLE_REQUIREMENTS,
  VEHICLE_REQUIREMENTS,
  VEHICLE_TYPES,
  isAsked,
  requirementsFor,
  vehicleLabel,
} from './vehicle';
export type { FieldRequirement, Vehicle, VehicleRequirements, VehicleType } from './vehicle';

/** Un visitante declara el mismo vehículo que cualquier otro usuario. */
export type VisitorVehicle = Vehicle;

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

export interface VisitorRegistration {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  vehicle: Vehicle;
  reason: string;
}

/**
 * - pending: emitido y sin usar.
 * - used: ya validado en portería; no sirve para otro ingreso.
 * - expired: se venció sin usarse. No se guarda: se calcula con la hora
 *   (ver `VisitorPassService.statusOf`).
 * - revoked: anulado, p. ej. porque el visitante generó uno nuevo.
 */
export type PassStatus = 'pending' | 'used' | 'expired' | 'revoked';

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  pending: 'Vigente',
  used: 'Usado',
  expired: 'Vencido',
  revoked: 'Anulado',
};

export interface VisitorPass {
  /** Lo único que viaja dentro del código QR. */
  token: string;
  visitor: VisitorRegistration;
  issuedAt: Date;
  expiresAt: Date;
  /** Estado guardado; el vencimiento se calcula aparte con la hora actual. */
  status: PassStatus;
  /** Cuándo se validó en portería. */
  usedAt?: Date;
  /** Estancia que abrió el ingreso con este pase. */
  stayId?: string;
  /** Guardia que lo validó. */
  usedBy?: string;
  /** Por qué se anuló. */
  revokedReason?: string;
}

/** Nombres y apellidos del visitante, tal como los escribió. */
export function visitorFullName(visitor: VisitorRegistration): string {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

export function documentLabel(value: DocumentType): string {
  return DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? value;
}
