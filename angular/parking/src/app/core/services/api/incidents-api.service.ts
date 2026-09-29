/**
 * Módulo de incidencias del backend (`/incidents`).
 *
 * Guarda la lista cargada en un signal porque la comparten la sección de
 * incidencias y el contador del menú de administración.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environments';
import type { Incident } from '../../models/incident';

/** Estado con el que se crea una novedad; el backend lo guarda como texto libre. */
const OPEN_STATUS = 'abierta';

/** Incidencia tal como la devuelve el backend. */
export interface BackendIncident {
  id_incidencia: number;
  /** ISO 8601. */
  fecha_hora: string;
  tipo: string;
  descripcion: string;
  estado: string;
  /** Quien la reportó (la fila de la tabla de usuarios). */
  owner?: { id_user: string; name_user: string } | null;
}

/** Lo que llena portería al reportar una novedad. */
export interface NewIncident {
  title: string;
  description: string;
  /** uid de quien la reporta. */
  reporterUid: string;
}

function toIncident(incident: BackendIncident): Incident {
  return {
    id: String(incident.id_incidencia),
    title: incident.tipo,
    description: incident.descripcion,
    status: /^resuel/i.test(incident.estado) ? 'resolved' : 'open',
    reportedAt: new Date(incident.fecha_hora),
    reportedBy: incident.owner?.name_user ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/incidents`;
  private readonly state = signal<Incident[]>([]);

  /** Incidencias cargadas con {@link load}, en el orden del backend. */
  readonly incidents = this.state.asReadonly();

  async load(): Promise<void> {
    const incidents = await firstValueFrom(this.http.get<BackendIncident[]>(this.baseUrl));
    this.state.set(incidents.map(toIncident));
  }

  /**
   * Reporta una novedad con la hora actual y estado «abierta».
   *
   * @throws HttpErrorResponse si el backend la rechaza, p. ej. si el título tiene
   * menos de 3 caracteres o la descripción menos de 5.
   */
  async report({ title, description, reporterUid }: NewIncident): Promise<void> {
    await firstValueFrom(
      this.http.post(this.baseUrl, {
        fecha_hora: new Date().toISOString(),
        tipo: title,
        descripcion: description,
        estado: OPEN_STATUS,
        id_usuario: reporterUid,
      }),
    );
  }
}
