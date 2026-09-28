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
 * Por ahora solo están en alcance el registro y el QR. `getVehiclesByUserId`
 * queda lista para cuando el backend publique un endpoint de "mis vehículos"
 * (Fase 5 del plan de desarrollo del panel de usuarios): hoy no existe
 * `GET /users/:id/vehicles`, así que ningún componente la llama todavía.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';
import type { VehicleType } from '../../../models/vehicle';

/**
 * Vehículo tal como lo devuelve el backend al crearlo. `owner` viaja como el
 * uid que se envió (el `save()` de TypeORM no vuelve a cargar la relación):
 * si más adelante `getVehiclesByUserId` empieza a usarse de verdad, confirmar
 * si esa lista trae el dueño anidado en vez del uid plano.
 */
export interface BackendVehicle {
  plate: string;
  brand: string;
  model: number;
  color: string;
  type: string;
  owner: string;
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
  private readonly baseUrlUsers = `${environment.apiUrl}/users`;

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

  /**
   * "Mis vehículos" del usuario. Sin uso todavía: el backend no expone hoy
   * `GET /users/:id/vehicles` (Fase 5, pendiente del backend).
   */
  getVehiclesByUserId(userId: string): Promise<BackendVehicle[]> {
    return firstValueFrom(this.http.get<BackendVehicle[]>(`${this.baseUrlUsers}/${userId}/vehicles`));
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
