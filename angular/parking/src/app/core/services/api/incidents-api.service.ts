import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';
import type { Incident, IncidentStatus } from '../models/incident';
import { createId } from '../utils/id';

export interface BackendIncident {
  id: number;
  title: string;
  description: string;
  reportDate: string;
  status: string;
  severity: string;
  userId: string | null;
  plate: string | null;
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/incidents`;

  private readonly state = signal<Incident[]>([]);
  readonly incidents = computed(() => this.state());

  async loadIncidents(): Promise<void> {
    const data = await firstValueFrom(this.http.get<BackendIncident[]>(this.baseUrl));
    this.state.set(data.map(i => ({
      id: String(i.id),
      title: i.title,
      description: i.description,
      zoneName: 'General',
      status: (i.status as IncidentStatus) || 'open',
      severity: i.severity as any,
      reportedAt: new Date(i.reportDate),
      reportedBy: i.userId || 'Sistema',
      plate: i.plate || undefined,
    })));
  }

  async report(incident: Omit<Incident, 'id' | 'status' | 'reportedAt'>): Promise<void> {
    await firstValueFrom(this.http.post(this.baseUrl, {
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      plate: incident.plate,
    }));
    await this.loadIncidents();
  }

  async resolve(id: string, resolution: string): Promise<void> {
    await firstValueFrom(this.http.put(`${this.baseUrl}/${id}`, { status: 'resolved' }));
    await this.loadIncidents();
  }
}
