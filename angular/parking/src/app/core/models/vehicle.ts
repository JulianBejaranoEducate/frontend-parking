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
}

export function vehicleLabel(value: VehicleType): string {
  return VEHICLE_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function requirementsFor(type: VehicleType | ''): VehicleRequirements {
  return type ? VEHICLE_REQUIREMENTS[type] : NO_VEHICLE_REQUIREMENTS;
}
