/**
 * Datos que declara un visitante en el formulario.
 *
 * El QR que se genera al enviarlo no lleva estos datos: lleva solo el id que
 * el backend le asignó al registro (ver `VisitorsApiService`). El detalle solo
 * aparece cuando el personal de seguridad resuelve ese id contra el backend.
 */
import type { Vehicle } from './vehicle';

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
