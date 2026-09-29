/**
 * Datos que declara un visitante en el formulario.
 *
 * El QR que se genera al enviarlo no lleva estos datos: lleva solo el id que
 * el backend le asignó al registro (ver `VisitorApiService`). El detalle solo
 * aparece cuando el personal de seguridad resuelve ese id contra el backend.
 */
import type { Vehicle } from './vehicle';

// La taxonomía de vehículos vive en ./vehicle porque el dashboard de usuarios
// también la necesita; se reexporta para no romper a quien ya la importa de aquí.
export { VEHICLE_TYPES, vehicleLabel } from './vehicle';
export type { Vehicle, VehicleType } from './vehicle';

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

/** Nombres y apellidos del visitante, tal como los escribió. */
export function visitorFullName(visitor: VisitorRegistration): string {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

export function documentLabel(value: DocumentType): string {
  return DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? value;
}
