/**
 * Habla con el módulo de vehículos del backend real, desde el panel del
 * estudiante (fase de conexión; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * Sigue el mismo patrón que `VisitorApiService`: un servicio por módulo del
 * backend, con la forma exacta que espera `POST /vehicles`
 * (`CreateVehicle.validation.ts`, Joi) y sin nada del modelo de demostración —
 * por eso `postCreate` recibe un `VehicleRegistrationInput` propio, no el
 * `VehicleRegistration` de `core/models/vehicle-registration.ts` (ese es del
 * flujo de aprobación en demo, con dueño declarado, documentos y revisiones;
 * nada de eso existe todavía en el backend).
 *
 * Por ahora solo están en alcance el registro y el QR. "Mis vehículos" sale
 * de `StudentsApiService` (`GET /users/:id`, con los vehículos anidados), no
 * de este servicio: el backend no expone un `GET /users/:id/vehicles` aparte.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';
import type { VehicleType } from '../../../models/vehicle';

/**
 * Vehículo tal como lo devuelve el backend al crearlo: el dueño viaja como
 * `id_owner` (el uid plano que se envió; el `save()` de TypeORM no vuelve a
 * cargar la relación). Confirmado contra el backend real (PEN-022): no es
 * `owner`, como decía antes esta interfaz.
 */
export interface BackendVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  id_owner: string;
}

/** Datos que pide el formulario de registro para crear un vehículo institucional. */
export interface VehicleRegistrationInput {
  type: VehicleType;
  brand: string;
  model: number;
  color: string;
  plate?: string;
  /** Pilas esto es el uid del Firebase del usuario autenticado que registra el vehículo. */
  ownerUid: string;
}

interface CreateVehiclePayload {
  plate?: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  owner: string;
}

@Injectable({ providedIn: 'root' })
export class VehiclesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrlVehicles = `${environment.apiUrl}/vehicles`;

  /**
   * Registra un vehículo institucional a nombre del usuario autenticado.
   *
   * Si no se envía placa (scooters y bicicletas no la llevan), el backend le
   * asigna él mismo un identificador (es la llave primaria de la tabla). Usa
   * siempre el `plate` de la respuesta para lo que sigue (por ejemplo, el QR):
   * nunca el valor que tenías en el formulario antes de crear el vehículo.
   */
  postCreate(input: VehicleRegistrationInput): Promise<BackendVehicle> {
    return firstValueFrom(this.http.post<BackendVehicle>(this.baseUrlVehicles, this.toPayload(input)));
  }

  /**
   * Dibuja el QR como data URL, con la misma librería y las mismas opciones
   * que ya usa Visitantes (`VisitorApiService.renderQrCode`). Este es un Import dinámico
   * para que su peso no entre en el paquete inicial del formulario solo al renderizar el QR.
   */
  async renderQrCode(plate: string): Promise<string> {
    const QRCode = await import('qrcode');
    return QRCode.toDataURL(plate, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
  }

  private toPayload(input: VehicleRegistrationInput): CreateVehiclePayload {
    return {
      brand: input.brand,
      model: input.model,
      color: input.color,
      type: input.type,
      owner: input.ownerUid,
      ...(input.plate ? { plate: input.plate } : {}),
    };
  }
}
