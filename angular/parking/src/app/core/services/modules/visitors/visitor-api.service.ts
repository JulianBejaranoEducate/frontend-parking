/**
 * Habla con el módulo real de visitantes del backend (rama `camilo-dev` de
 * `Backend_Uni-Parking`; ver "Conexión frontend-backend" en
 * planeacion-desarrollo.md).
 *
 * Los datos del vehículo del visitante viven en su propia fila, no en la tabla
 * de vehículos (esa es solo de la comunidad). Crear el registro no es el
 * ingreso: el ingreso y la salida son registros de acceso que abre y cierra
 * portería con `ParkingApiService` (ADR-021).
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
  /** Cuándo llenó el formulario; no es la hora de ingreso. */
  created_at: string;
  exited_at?: string | null;
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
   * Registra la visita. El `id` que devuelve el backend es lo que codifica el
   * QR con el que portería valida el ingreso.
   */
  create(visitor: VisitorRegistration): Promise<BackendVisitor> {
    return firstValueFrom(this.http.post<BackendVisitor>(this.baseUrl, this.toPayload(visitor)));
  }

  /** Todos los registros de visita: con ellos se muestra quién es cada visitante que está dentro. */
  findAll(): Promise<BackendVisitor[]> {
    return firstValueFrom(this.http.get<BackendVisitor[]>(this.baseUrl));
  }

  /** Lo que ve portería al escanear el QR: el id es un número, no un token. */
  findById(id: number): Promise<BackendVisitor> {
    return firstValueFrom(this.http.get<BackendVisitor>(`${this.baseUrl}/${id}`));
  }

  /**
   * Para cuando el visitante no tiene el QR a mano. Una persona puede
   * registrarse varias veces: vale su registro más reciente.
   */
  findLatestByDocument(documentNumber: string): Promise<BackendVisitor | null> {
    return this.findLatest((visitor) => visitor.document_number === documentNumber);
  }

  findLatestByPlate(plate: string): Promise<BackendVisitor | null> {
    return this.findLatest((visitor) => visitor.plate_vehicle_visitor === plate);
  }

  private async findLatest(matches: (visitor: BackendVisitor) => boolean): Promise<BackendVisitor | null> {
    const visitors = await this.findAll();
    // El id lo asigna la base de datos en orden: el mayor es el registro más reciente.
    return visitors.filter(matches).reduce<BackendVisitor | null>((latest, visitor) => (!latest || visitor.id > latest.id ? visitor : latest), null);
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
