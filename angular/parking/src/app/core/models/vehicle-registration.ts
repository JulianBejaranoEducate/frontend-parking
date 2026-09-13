/**
 * Solicitud de registro de un vehículo institucional.
 *
 * El flujo tiene dos validaciones:
 * 1. El usuario escribe a mano sus datos y los del vehículo. Los nombres se
 *    comparan en el acto con los de su cuenta institucional (compareNames).
 * 2. Adjunta la foto del documento del vehículo y la administración comprueba,
 *    campo por campo, que lo escrito coincide con lo que se ve en la foto.
 *
 * La segunda validación es humana a propósito: una foto tomada con el celular
 * no es fiable para leerla automáticamente, y quien aprueba responde por ello.
 */
import type { Affiliation } from '../services/auth.service';
import type { Vehicle, VehicleType } from './vehicle';
import type { DocumentType } from './visitor-pass';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'needs-update';

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  'needs-update': 'Actualizar documentos',
};

// ---- Documentos ------------------------------------------------------------------

export type DocumentKind =
  | 'property-card-front'
  | 'property-card-back'
  | 'frame-serial'
  | 'purchase-proof';

export interface DocumentRequirement {
  kind: DocumentKind;
  label: string;
  required: boolean;
  /** Valor del atributo accept del selector de archivos. */
  accept: string;
  hint: string;
}

/** Qué documentos pide cada tipo de vehículo y cuáles son obligatorios. */
export const DOCUMENT_REQUIREMENTS: Record<VehicleType, readonly DocumentRequirement[]> = {
  moto: [
    {
      kind: 'property-card-front',
      label: 'Tarjeta de propiedad (cara frontal)',
      required: true,
      accept: 'image/*',
      hint: 'Deben leerse la placa, la marca, la línea, el modelo, el color y el propietario.',
    },
    {
      kind: 'property-card-back',
      label: 'Tarjeta de propiedad (cara posterior)',
      required: false,
      accept: 'image/*',
      hint: 'Opcional. Ayuda a confirmar la fecha de matrícula.',
    },
  ],
  bicicleta: [
    {
      kind: 'frame-serial',
      label: 'Foto del serial del marco',
      required: false,
      accept: 'image/*',
      hint: 'No todas las bicicletas lo tienen. Si la tuya sí, una foto donde se lea ayuda a comprobar que es tuya.',
    },
  ],
  scooter: [
    {
      kind: 'purchase-proof',
      label: 'Factura o certificado de importación',
      required: false,
      accept: 'image/*,application/pdf',
      hint: 'Los scooters no tienen tarjeta de propiedad. Si tienes la factura, agiliza la aprobación.',
    },
  ],
};

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  'property-card-front': 'Tarjeta de propiedad (frontal)',
  'property-card-back': 'Tarjeta de propiedad (posterior)',
  'frame-serial': 'Serial del marco',
  'purchase-proof': 'Factura o certificado',
};

export interface RegistrationDocument {
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  /** TODO: en producción será la ruta del archivo en Firebase Storage. */
  dataUrl: string;
  uploadedAt: Date;
}

export function missingRequiredDocuments(
  type: VehicleType,
  documents: readonly Pick<RegistrationDocument, 'kind'>[],
): DocumentRequirement[] {
  return DOCUMENT_REQUIREMENTS[type].filter(
    (requirement) => requirement.required && !documents.some((doc) => doc.kind === requirement.kind),
  );
}

// ---- Personas ----------------------------------------------------------------------

/** Lo que el usuario escribió sobre sí mismo en el formulario. */
export interface DeclaredOwner {
  firstName: string;
  lastName: string;
  documentType?: DocumentType;
  documentNumber?: string;
}

/** Quién envió la solicitud, tal como lo informa su cuenta institucional. */
export interface Applicant {
  uid: string;
  displayName: string;
  email: string;
  affiliation: Affiliation | null;
  program: string | null;
}

export function declaredFullName(owner: DeclaredOwner): string {
  return `${owner.firstName} ${owner.lastName}`.trim();
}

// ---- Revisión ----------------------------------------------------------------------

export type ReviewOutcome = 'approved' | 'rejected' | 'needs-update';

export interface ReviewDecision {
  outcome: ReviewOutcome;
  reviewer: string;
  decidedAt: Date;
  /** Motivo de rechazo, uno de REJECTION_REASONS. */
  reason?: string;
  /** Documento que el usuario debe volver a enviar. */
  documentKind?: DocumentKind;
  note?: string;
}

export const REJECTION_REASONS = [
  'Faltan documentos',
  'Documento ilegible',
  'Los datos no coinciden con el documento',
  'El propietario no coincide con la cuenta',
  'Otro motivo',
] as const;

export interface VehicleRegistration {
  id: string;
  applicant: Applicant;
  owner: DeclaredOwner;
  vehicle: Vehicle;
  documents: RegistrationDocument[];
  status: RegistrationStatus;
  submittedAt: Date;
  updatedAt: Date;
  /** Decisiones de la administración, de la más antigua a la más reciente. */
  reviews: ReviewDecision[];
}

export function latestReview(registration: VehicleRegistration): ReviewDecision | null {
  return registration.reviews.at(-1) ?? null;
}

/** Volvió a revisión después de que la administración pidió actualizar algo. */
export function wasResubmitted(registration: VehicleRegistration): boolean {
  return (
    registration.status === 'pending' &&
    registration.reviews.some((review) => review.outcome === 'needs-update')
  );
}

/** Texto para el usuario: por qué se rechazó o qué debe actualizar. */
export function statusNote(registration: VehicleRegistration): string | undefined {
  const review = latestReview(registration);

  if (!review || registration.status === 'approved' || registration.status === 'pending') {
    return undefined;
  }

  const lead =
    review.outcome === 'needs-update' && review.documentKind
      ? `Vuelve a enviar: ${DOCUMENT_LABELS[review.documentKind]}.`
      : review.reason;

  return [lead, review.note].filter(Boolean).join(' ');
}

// ---- Comparación de nombres ----------------------------------------------------------

export type NameMatch = 'match' | 'partial' | 'mismatch';

/** Partículas que no identifican a nadie: "de", "del", "la"... */
const NAME_PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y']);

/** "José de la Peña" → ["JOSE", "PENA"]: sin tildes, sin partículas, en mayúsculas. */
export function nameTokens(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !NAME_PARTICLES.has(token));
}

/**
 * Compara dos nombres sin importar el orden ni las tildes. La licencia de
 * tránsito pone primero los apellidos ("BEJARANO ROJAS JULIAN") y la cuenta
 * suele omitir el segundo nombre, así que basta con que el nombre más corto
 * quede contenido en el más largo.
 *
 * partial: comparten algún nombre pero no todos. Es la señal típica de un
 * vehículo a nombre de un familiar, y la decide la administración.
 */
export function compareNames(declared: string, reference: string): NameMatch {
  const a = new Set(nameTokens(declared));
  const b = new Set(nameTokens(reference));

  if (a.size === 0 || b.size === 0) {
    return 'mismatch';
  }

  const shared = [...a].filter((token) => b.has(token)).length;

  if (shared === Math.min(a.size, b.size)) {
    return 'match';
  }

  return shared > 0 ? 'partial' : 'mismatch';
}
