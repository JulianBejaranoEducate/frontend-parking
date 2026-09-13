/**
 * Taxonomía de vehículos, compartida por el registro de visitantes y por el
 * dashboard de usuarios. El parqueadero de la universidad solo recibe vehículos
 * de dos ruedas, así que el automóvil no es una opción en ninguna pantalla.
 */

export const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicicleta', label: 'Bicicleta' },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];

export interface VehicleRequirements {
  brand: boolean;
  color: boolean;
  plate: boolean;
}

/**
 * Qué datos pide cada tipo de vehículo. Es la única fuente de verdad: de aquí
 * salen tanto los campos que se muestran como los validadores del formulario.
 */
export const VEHICLE_REQUIREMENTS: Record<VehicleType, VehicleRequirements> = {
  moto: { brand: true, color: true, plate: true },
  scooter: { brand: false, color: false, plate: false },
  bicicleta: { brand: true, color: true, plate: false },
};

export const NO_VEHICLE_REQUIREMENTS: VehicleRequirements = {
  brand: false,
  color: false,
  plate: false,
};

export interface Vehicle {
  type: VehicleType;
  /** Solo para moto y bicicleta. */
  brand?: string;
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

export function requirementsFor(type: VehicleType | ''): VehicleRequirements {
  return type ? VEHICLE_REQUIREMENTS[type] : NO_VEHICLE_REQUIREMENTS;
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
