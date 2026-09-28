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
  frameSerial: FieldRequirement;
}

/**
 * Qué datos pide cada tipo de vehículo. Es la única fuente de verdad: de aquí
 * salen tanto los campos que se muestran como los validadores del formulario
 * de visitantes y del registro de vehículos.
 *
 * La marca es obligatoria en los tres tipos: el backend real de Vehículos la
 * exige siempre, sin excepción por tipo (`CreateVehicle.validation.ts`), así
 * que el frontend no puede dejarla opcional para el scooter aunque antes lo
 * fuera en el modelo de demostración — si se registrara así, el vehículo
 * real fallaría al crearse.
 *
 * - Bicicleta: serial del marco opcional, porque no todas lo tienen a la vista.
 */
export const VEHICLE_REQUIREMENTS: Record<VehicleType, VehicleRequirements> = {
  moto: { brand: 'required', color: 'required', plate: 'required', frameSerial: 'none' },
  scooter: { brand: 'required', color: 'required', plate: 'none', frameSerial: 'none' },
  bicicleta: { brand: 'required', color: 'required', plate: 'none', frameSerial: 'optional' },
};

/** Requisitos mientras todavía no se elige el tipo de vehículo: no se pide nada. */
export const NO_VEHICLE_REQUIREMENTS: VehicleRequirements = {
  brand: 'none',
  color: 'none',
  plate: 'none',
  frameSerial: 'none',
};

/** true si el dato se pide, sea obligatorio u opcional. */
export function isAsked(requirement: FieldRequirement): boolean {
  return requirement !== 'none';
}

/** Datos de un vehículo; cuáles lleva según su tipo lo decide `VEHICLE_REQUIREMENTS`. */
export interface Vehicle {
  type: VehicleType;
  /** Moto y bicicleta; en el scooter es opcional. */
  brand?: string;
  /** Obligatorio en los tres tipos (en registros anteriores a la Fase 2 puede faltar en scooters). */
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

/**
 * Requisitos del tipo elegido.
 *
 * @param type Tipo de vehículo, o cadena vacía si todavía no se eligió.
 */
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

// ---- Vehículos reales del backend, ya traducidos para pantalla ----------------

/**
 * Vehículo institucional tal como lo muestran "Mis vehículos" y "Vehículos":
 * un `Vehicle` de pantalla más el identificador real y si está dentro del
 * parqueadero ahora mismo. Lo arma {@link toDashboardVehicle} a partir de la
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
  /** true = está dentro del parqueadero ahora mismo (no es un estado de aprobación). */
  isAuthorized: boolean;
}

/**
 * Datos mínimos que trae cada vehículo anidado en `GET /users/:id`
 * (`BackendUserVehicle` en `students-api.sp.service.ts`). Se declara aquí,
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
