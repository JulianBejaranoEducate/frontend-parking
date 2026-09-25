/**
 * Habla con el módulo de visitantes del backend real (fase de conexión;
 * ver "Conexión frontend-backend" en planeacion-desarrollo.md).
 *
 * Reemplaza, para este módulo, los datos de demostración de
 * `VisitorPassService`: crear un visitante, consultarlo por id (lo que trae el
 * QR), autorizar su ingreso y registrar su salida ya hablan con Postgres a
 * través del backend en `Backend_Uni-Parking`.
 *
 * Por ahora estas rutas no exigen el token de Firebase (se conecta primero el
 * flujo de datos; la verificación con `verifyFirebaseToken` es el siguiente
 * paso, cuando el frontend ya pueda iniciar sesión de verdad).
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';
import type { DocumentType, VisitorRegistration } from '../models/visitor-pass';

/** Vehículo tal como lo guarda el backend. */
export interface BackendVehicle {
  id: string;
  plate: string | null;
  brand: string | null;
  model: number | null;
  color: string;
  type: string;
  is_authorized: boolean;
  id_owner: number | null;
  frame_serial: string | null;
}

/** Visitante tal como lo devuelve el backend real. */
export interface BackendVisitor {
  id: string;
  first_name: string;
  last_name: string;
  document_type: DocumentType;
  document_number: string;
  reason: string;
  is_authorized: boolean;
  vehicle: BackendVehicle;
  created_at: string;
  /** Null mientras el visitante sigue dentro. */
  exited_at: string | null;
}

interface CreateVisitorPayload {
  first_name: string;
  last_name: string;
  document_type: DocumentType;
  document_number: string;
  reason: string;
  vehicle: {
    plate?: string;
    brand?: string;
    model?: number;
    color: string;
    type: string;
    frame_serial?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class VisitorApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/visitors`;

  /** Registra al visitante y su vehículo. El `id` que devuelve es lo que lleva el QR. */
  create(visitor: VisitorRegistration): Promise<BackendVisitor> {
    return firstValueFrom(this.http.post<BackendVisitor>(this.baseUrl, this.toPayload(visitor)));
  }

  /** Lo que ve portería al escanear el QR: busca por el id del visitante. */
  findById(id: string): Promise<BackendVisitor> {
    return firstValueFrom(this.http.get<BackendVisitor>(`${this.baseUrl}/${id}`));
  }

  /** El guardia confirma el ingreso. */
  authorize(id: string): Promise<BackendVisitor> {
    return firstValueFrom(this.http.patch<BackendVisitor>(`${this.baseUrl}/${id}/authorize`, {}));
  }

  /** El guardia registra la salida. */
  registerExit(id: string): Promise<BackendVisitor> {
    return firstValueFrom(this.http.patch<BackendVisitor>(`${this.baseUrl}/${id}/exit`, {}));
  }

  /**
   * El backend, hoy, no tiene un campo para la "línea" de la moto (p. ej. "FZ
   * 2.0"; solo `brand`, `color`, `plate`, `model` y `frame_serial`): por ahora
   * ese dato no viaja. Tampoco valida `id_owner`, porque el vehículo de un
   * visitante no tiene propietario institucional.
   */
  private toPayload(visitor: VisitorRegistration): CreateVisitorPayload {
    const { vehicle } = visitor;

    return {
      first_name: visitor.firstName,
      last_name: visitor.lastName,
      document_type: visitor.documentType,
      document_number: visitor.documentNumber,
      reason: visitor.reason,
      vehicle: {
        type: vehicle.type,
        color: vehicle.color ?? '',
        ...(vehicle.plate ? { plate: vehicle.plate } : {}),
        ...(vehicle.brand ? { brand: vehicle.brand } : {}),
        ...(vehicle.modelYear ? { model: vehicle.modelYear } : {}),
        ...(vehicle.frameSerial ? { frame_serial: vehicle.frameSerial } : {}),
      },
    };
  }
}
