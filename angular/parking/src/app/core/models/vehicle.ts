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
}

/**
 * Qué datos pide cada tipo de vehículo. Es la única fuente de verdad: de aquí
 * salen tanto los campos que se muestran como los validadores del formulario
 * de visitantes y del registro de vehículos.
 *
 * Marca y color son obligatorios en los tres tipos porque el backend los exige
 * siempre (`CreateVehicle.validation.ts`); la placa, solo en la moto.
 */
export const VEHICLE_REQUIREMENTS: Record<VehicleType, VehicleRequirements> = {
  moto: { brand: 'required', color: 'required', plate: 'required' },
  scooter: { brand: 'required', color: 'required', plate: 'none' },
  bicicleta: { brand: 'required', color: 'required', plate: 'none' },
};

/** Datos de un vehículo; cuáles lleva según su tipo lo decide `VEHICLE_REQUIREMENTS`. */
export interface Vehicle {
  type: VehicleType;
  brand?: string;
  color?: string;
  /** Solo para moto: scooter y bicicleta no llevan placa. */
  plate?: string;
  /** El "modelo" de la licencia de tránsito, que en Colombia es el año. */
  modelYear?: number;
}

export function vehicleLabel(value: VehicleType): string {
  return VEHICLE_TYPES.find((type) => type.value === value)?.label ?? value;
}

// ---- Vehículos registrados por usuarios institucionales ----------------------

/** Tope de vehículos que un usuario institucional puede tener registrados. */
export const MAX_VEHICLES_PER_USER = 5;

/**
 * Identificador principal de un vehículo: la placa cuando la tiene; si no
 * (scooter, bicicleta), su tipo.
 */
export function vehicleTitle(vehicle: Vehicle): string {
  return vehicle.plate ?? vehicleLabel(vehicle.type);
}

/** Datos secundarios sin repetir el título. Ej. "Moto · Yamaha · Negro". */
export function vehicleDetails(vehicle: Vehicle): string {
  return [vehicle.plate ? vehicleLabel(vehicle.type) : null, vehicle.brand, vehicle.color]
    .filter(Boolean)
    .join(' · ');
}

// ---- Vehículos reales del backend, ya traducidos para pantalla ----------------

/**
 * Vehículo institucional tal como lo muestran "Mis vehículos" y "Vehículos":
 * un `Vehicle` de pantalla más el identificador real y si ya está aprobado. Lo arma {@link toDashboardVehicle} a partir de la
 * respuesta del backend (`GET /users/:id`).
 */
export interface DashboardVehicle extends Vehicle {
  /**
   * El valor tal cual de la columna `plate` del backend: la llave primaria de
   * la tabla, sea una placa real (moto) o el identificador que el backend le
   * asigna a lo que no lleva placa (scooter, bicicleta). Es lo que hay que
   * codificar en el QR — nunca `plate`, que aquí es solo para mostrar en pantalla.
   */
  id: string;
  /**
   * true cuando la administración ya aprobó el vehículo: solo entonces el
   * backend le registra ingresos. Un vehículo recién registrado llega en false.
   */
  isAuthorized: boolean;
}

/**
 * Datos mínimos que trae cada vehículo anidado en `GET /users/:id`
 * (`BackendUserVehicle` en `users-api.service.ts`). Se declara aquí,
 * sin importar ese tipo, para que este archivo de modelos no dependa de un
 * servicio.
 */
interface BackendVehicleLike {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  is_authorized: boolean;
}

/**
 * Traduce un vehículo tal como lo devuelve el backend real a la forma que usa
 * la pantalla. El backend le asigna su propio identificador (UUID) al
 * vehículo que no lleva placa (scooter, bicicleta): no es una placa real, así
 * que `plate` (el campo de pantalla) no se llena para esos casos — pero
 * `id` sí guarda ese valor siempre, porque es el identificador real que hay
 * que usar para buscar el vehículo (por ejemplo, en el QR).
 */
export function toDashboardVehicle(vehicle: BackendVehicleLike): DashboardVehicle {
  const type = vehicle.type as VehicleType;
  const hasRealPlate = VEHICLE_REQUIREMENTS[type]?.plate === 'required';

  return {
    id: vehicle.plate,
    type,
    brand: vehicle.brand,
    color: vehicle.color,
    modelYear: vehicle.model,
    isAuthorized: vehicle.is_authorized,
    ...(hasRealPlate ? { plate: vehicle.plate } : {}),
  };
}
