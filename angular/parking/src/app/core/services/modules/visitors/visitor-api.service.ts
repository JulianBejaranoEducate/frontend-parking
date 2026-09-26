/**
 * Habla con el módulo real de visitantes del backend (rama `camilo-dev` de
 * `Backend_Uni-Parking`; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * El modelo cambió respecto a como se pensó al principio: los datos del
 * vehículo ya no se guardan en la tabla de vehículos (esa es solo para
 * usuarios institucionales) — viven directo en la fila del visitante, sin
 * duplicar nada. Y ya no existe un paso de "autorizar el ingreso": crear el
 * registro (llenar el formulario y generar el QR) **es** el ingreso; lo único
 * que confirma el personal de seguridad, con un botón, es la salida.
 *
 * No se puede modificar el backend, así que este servicio se adapta tal cual
 * a lo que expone hoy `Visitor.routes.ts`: crear, consultar por id (lo que
 * lleva el QR), listar y registrar la salida. No hay endpoint de autorizar.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';
import type { DocumentType, VisitorRegistration } from '../../../models/visitor-pass';

/** Visitante tal como lo devuelve el backend: un registro plano, sin vehículo anidado. */
export interface BackendVisitor {
  id: number;
  first_name: string;
  last_name: string;
  document_type: DocumentType;
  document_number: string;
  reason: string;
  plate_vehicle_visitor: string | null;
  brand_vehicle: string;
  color_vehicle: string;
  type_vehicle: string;
  model_vehicle: number;
  created_at: string;
  /** Null mientras el visitante sigue dentro; lo llena `registerExit`. */
  exited_at: string | null;
}

interface CreateVisitorPayload {
  first_name: string;
  last_name: string;
  document_type: DocumentType;
  document_number: string;
  reason: string;
  vehicle: { plate?: string; brand: string; color: string; type: string; model: number };
}

@Injectable({ providedIn: 'root' })
export class VisitorApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/visitors`;

  /**
   * Registra la visita. Esto **es** el ingreso: no hay confirmación aparte del
   * personal de seguridad. El `id` que devuelve el backend es lo que codifica
   * el QR, y es lo que después usa portería para registrar la salida.
   */
  create(visitor: VisitorRegistration): Promise<BackendVisitor> {
    return firstValueFrom(this.http.post<BackendVisitor>(this.baseUrl, this.toPayload(visitor)));
  }

  /** Todos los visitantes, para el resumen de seguridad. */
  findAll(): Promise<BackendVisitor[]> {
    return firstValueFrom(this.http.get<BackendVisitor[]>(this.baseUrl));
  }

  /** Lo que ve portería al escanear el QR: el id es un número, no un token. */
  findById(id: number): Promise<BackendVisitor> {
    return firstValueFrom(this.http.get<BackendVisitor>(`${this.baseUrl}/${id}`));
  }

  /** Única acción del guardia sobre un visitante: marcar que ya salió. */
  registerExit(id: number): Promise<BackendVisitor> {
    return firstValueFrom(this.http.patch<BackendVisitor>(`${this.baseUrl}/${id}/exit`, {}));
  }

  /**
   * Dibuja el QR como data URL. La librería se carga con import dinámico para
   * que su peso no entre en el paquete inicial del formulario.
   */
  async renderQrCode(value: string): Promise<string> {
    const QRCode = await import('qrcode');
    return QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
  }

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
        // El backend los exige siempre, sin importar el tipo de vehículo.
        brand: vehicle.brand ?? '',
        color: vehicle.color ?? '',
        // El formulario no le pregunta el modelo a un visitante; el año actual
        // es un valor razonable mientras el backend lo siga exigiendo siempre.
        model: vehicle.modelYear ?? new Date().getFullYear(),
        ...(vehicle.plate ? { plate: vehicle.plate } : {}),
      },
    };
  }
}
