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
  requirementsFor,
  vehicleLabel,
} from './vehicle';
export type { Vehicle, VehicleRequirements, VehicleType } from './vehicle';

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
 * pending: emitido y sin usar. used: ya validado en portería, no sirve otra vez.
 * expired: se venció sin usarse. revoked: anulado a mano por seguridad.
 */
export type PassStatus = 'pending' | 'used' | 'expired' | 'revoked';

export interface VisitorPass {
  /** Lo único que viaja dentro del código QR. */
  token: string;
  visitor: VisitorRegistration;
  issuedAt: Date;
  expiresAt: Date;
  status: PassStatus;
}

export function documentLabel(value: DocumentType): string {
  return DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? value;
}
