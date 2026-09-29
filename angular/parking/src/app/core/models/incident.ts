/**
 * Novedad reportada dentro del parqueadero (módulo de incidencias del backend).
 *
 * El backend guarda un tipo (aquí, el título), una descripción, un estado,
 * la fecha y quién la reportó; no guarda gravedad ni placa.
 */
export type IncidentStatus = 'open' | 'resolved';

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierta',
  resolved: 'Resuelta',
};

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  reportedAt: Date;
  /** Nombre de quien la reportó; vacío si el backend no trae el usuario. */
  reportedBy: string;
}
