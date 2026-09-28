/**
 * Habla con el módulo Parking del backend (rama `camilo-dev`): zonas de
 * parqueo y registros de acceso (ADR-021 en planeacion-desarrollo.md).
 *
 * Un ingreso abre un registro en `access_record` y ocupa un puesto de la zona
 * del tipo de vehículo; la salida cierra ese registro y libera el puesto.
 * Quién está dentro son los registros sin salida.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environments';

/** Zona de parqueo de un tipo de vehículo, tal como la devuelve `GET /parkingZone`. */
export interface BackendParkingZone {
  id: number;
  vehicleType: string;
  totalCapacity: number;
  availableSpaces: number;
}

/** Registro de un ingreso (y de su salida, cuando la hay). */
export interface BackendAccessRecord {
  /** Lo asigna la base de datos; la respuesta de un ingreso recién registrado lo trae vacío. */
  id: number | null;
  plate: string | null;
  /** Solo en los ingresos de visitantes; null para vehículos de la comunidad. */
  visitorId: number | null;
  zoneType: string;
  entryDateTime: string;
  exitDateTime: string | null;
}

interface AccessRecordResponse {
  message: string;
  data: BackendAccessRecord;
}

@Injectable({ providedIn: 'root' })
export class ParkingApiService {
  private readonly http = inject(HttpClient);
  private readonly zonesUrl = `${environment.apiUrl}/parkingZone`;
  private readonly accessUrl = `${environment.apiUrl}/parking`;

  /** Capacidad y puestos libres de cada zona. */
  zones(): Promise<BackendParkingZone[]> {
    return firstValueFrom(this.http.get<BackendParkingZone[]>(this.zonesUrl));
  }

  /** Quién está dentro ahora: registros sin salida, del ingreso más reciente al más antiguo. */
  openRecords(): Promise<BackendAccessRecord[]> {
    return firstValueFrom(this.http.get<BackendAccessRecord[]>(`${this.accessUrl}/records/open`));
  }

  /**
   * Valida el ingreso de un visitante: es lo que pasa al escanear su QR.
   *
   * @param visitorId Id del registro del visitante, el que lleva el QR.
   * @returns El registro de acceso que abrió el backend.
   * @throws HttpErrorResponse si el backend rechaza el ingreso, p. ej. porque el visitante ya está dentro.
   */
  registerVisitorEntry(visitorId: number): Promise<BackendAccessRecord> {
    return this.record(this.http.post<AccessRecordResponse>(`${this.accessUrl}/entry/visitor/${visitorId}`, {}));
  }

  /**
   * Registra la salida de un visitante: cierra su registro abierto y libera el puesto.
   *
   * @param visitorId Id del registro del visitante.
   * @returns El registro de acceso ya cerrado.
   * @throws HttpErrorResponse si el backend la rechaza, p. ej. porque el visitante no está dentro.
   */
  registerVisitorExit(visitorId: number): Promise<BackendAccessRecord> {
    return this.record(this.http.patch<AccessRecordResponse>(`${this.accessUrl}/exit/visitor/${visitorId}`, {}));
  }

  /**
   * Ingreso de un vehículo de la comunidad; el backend exige que esté autorizado.
   *
   * @param plate Placa del vehículo.
   * @returns El registro de acceso que abrió el backend.
   * @throws HttpErrorResponse si el backend rechaza el ingreso (sin autorización, ya dentro o sin puestos).
   */
  registerVehicleEntry(plate: string): Promise<BackendAccessRecord> {
    return this.record(this.http.post<AccessRecordResponse>(`${this.accessUrl}/entry/${plate}`, {}));
  }

  /**
   * Salida de un vehículo de la comunidad: cierra su registro abierto y libera el puesto.
   *
   * @param plate Placa del vehículo.
   * @returns El registro de acceso ya cerrado.
   * @throws HttpErrorResponse si el backend la rechaza, p. ej. porque el vehículo no está dentro.
   */
  registerVehicleExit(plate: string): Promise<BackendAccessRecord> {
    return this.record(this.http.patch<AccessRecordResponse>(`${this.accessUrl}/exit/${plate}`, {}));
  }

  private record(request: Observable<AccessRecordResponse>): Promise<BackendAccessRecord> {
    return firstValueFrom(request.pipe(map((response) => response.data)));
  }
}
