/**
 * Taxonomía de vehículos: tipos, etiquetas y cómo se muestra un vehículo. La
 * comparten visitantes, seguridad y las pantallas de la comunidad y la
 * administración. El parqueadero de la universidad solo recibe vehículos de
 * dos ruedas, así que el automóvil no es una opción en ninguna pantalla.
 */

export const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicicleta', label: 'Bicicleta' },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];

/**
 * Si un dato del vehículo se pide y si es obligatorio:
 * - required: se pide y no se puede dejar vacío.
 * - optional: se pide, pero se puede dejar vacío.
 * - none: no se pide para ese tipo de vehículo.
 */
export type FieldRequirement = 'required' | 'optional' | 'none';

/** Datos del vehículo que pide cada tipo, con su nivel de obligatoriedad. */
export interface VehicleRequirements {
  brand: FieldRequirement;
  color: FieldRequirement;
  plate: FieldRequirement;
  frameSerial: FieldRequirement;
}

/**
 * Qué datos pide cada tipo de vehículo en el registro de vehículos de la
 * comunidad: de aquí salen los campos que se muestran y sus validadores. (El
 * formulario de visitantes sigue el modelo plano del backend, ADR-020.)
 *
 * - Scooter: color obligatorio y marca opcional, porque no todos la conocen.
 * - Bicicleta: serial del marco opcional, porque no todas lo tienen a la vista.
 */
export const VEHICLE_REQUIREMENTS: Record<VehicleType, VehicleRequirements> = {
  moto: { brand: 'required', color: 'required', plate: 'required', frameSerial: 'none' },
  scooter: { brand: 'optional', color: 'required', plate: 'none', frameSerial: 'none' },
  bicicleta: { brand: 'required', color: 'required', plate: 'none', frameSerial: 'optional' },
};

/** Datos de un vehículo; cuáles lleva según su tipo lo decide `VEHICLE_REQUIREMENTS`. */
export interface Vehicle {
  type: VehicleType;
  /** Moto y bicicleta; en el scooter es opcional. */
  brand?: string;
  /** Obligatorio en los tres tipos. */
  color?: string;
  /** Solo para moto: scooter y bicicleta no llevan placa. */
  plate?: string;
  /** Moto: la "línea" de la licencia de tránsito (p. ej. "FZ 2.0"). */
  line?: string;
  /** Moto: el "modelo" de la licencia de tránsito, que en Colombia es el año. */
  modelYear?: number;
  /** Bicicleta: número grabado en el marco, cuando lo tiene. */
  frameSerial?: string;
}

export function vehicleLabel(value: VehicleType): string {
  return VEHICLE_TYPES.find((type) => type.value === value)?.label ?? value;
}

// ---- Vehículos registrados por usuarios institucionales ----------------------

/** Tope de vehículos que un usuario institucional puede tener registrados. */
export const MAX_VEHICLES_PER_USER = 5;

/**
 * La administración revisa cada vehículo antes de dejarlo entrar.
 * needs-update: le pidió al usuario volver a enviar algún documento.
 */
export type VehicleApproval = 'approved' | 'pending' | 'rejected' | 'needs-update';

export const APPROVAL_LABELS: Record<VehicleApproval, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
  'needs-update': 'Actualizar documentos',
};

export interface RegisteredVehicle extends Vehicle {
  id: string;
  approval: VehicleApproval;
  registeredAt: Date;
  /** Explicación de la administración cuando rechazó o pidió actualizar. */
  statusNote?: string;
}

/**
 * Identificador principal de un vehículo: la placa cuando la tiene; si no
 * (scooter, bicicleta), su tipo.
 */
export function vehicleTitle(vehicle: Vehicle): string {
  return vehicle.plate ?? vehicleLabel(vehicle.type);
}

/** Datos secundarios sin repetir el título. Ej. "Moto · Yamaha FZ 2.0 · Negro". */
export function vehicleDetails(vehicle: Vehicle): string {
  const model = [vehicle.brand, vehicle.line].filter(Boolean).join(' ');

  return [vehicle.plate ? vehicleLabel(vehicle.type) : null, model, vehicle.color]
    .filter(Boolean)
    .join(' · ');
}
