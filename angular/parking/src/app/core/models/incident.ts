/** Novedad registrada dentro del parqueadero. */
export type IncidentSeverity = 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'in-review' | 'resolved';

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierta',
  'in-review': 'En revisión',
  resolved: 'Resuelta',
};

export interface Incident {
  id: string;
  title: string;
  description: string;
  zoneName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: Date;
  reportedBy: string;
  plate?: string;
  resolvedAt?: Date;
}
