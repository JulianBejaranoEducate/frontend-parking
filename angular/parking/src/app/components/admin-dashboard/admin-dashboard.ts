import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { INCIDENT_STATUS_LABELS, type Incident } from '../../core/models/incident';
import { type VehicleType, vehicleLabel } from '../../core/models/vehicle';
import { IncidentsApiService } from '../../core/services/api/incidents-api.service';
import { type BackendUser, UsersApiService } from '../../core/services/api/users-api.service';
import { type BackendVehicle, VehiclesApiService } from '../../core/services/api/vehicles-api.service';
import { ADMIN_SECTIONS, type AdminSection } from './admin-navigation';

const SECTION_COPY: Record<AdminSection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Lo que requiere tu atención hoy.' },
  pendientes: { title: 'Vehículos pendientes', subtitle: 'Vehículos registrados que todavía no tienen permiso para entrar.' },
  aprobados: { title: 'Vehículos aprobados', subtitle: 'Vehículos con permiso para entrar al parqueadero.' },
  usuarios: { title: 'Usuarios inactivos', subtitle: 'Usuarios dados de baja que se pueden reactivar.' },
  incidencias: { title: 'Incidencias', subtitle: 'Novedades reportadas por portería.' },
};

const LOAD_ERROR = 'No pudimos consultar el backend. Revisa la conexión e inténtalo de nuevo.';
const ACTION_ERROR = 'El backend no aceptó el cambio. Inténtalo de nuevo.';

/**
 * Dashboard de administración: aprobar vehículos (darles permiso para entrar),
 * quitar ese permiso, reactivar usuarios dados de baja y revisar las novedades
 * de portería. Todo sale del backend; el header y el menú los pone
 * `DashboardLayout`.
 */
@Component({
  imports: [DatePipe],
  selector: 'app-admin-dashboard',
  styleUrl: './admin-dashboard.css',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  /** Parámetro de ruta :section. */
  readonly section = input<string>('resumen');

  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly incidentsApi = inject(IncidentsApiService);

  /** Una sección que no existe muestra el resumen. */
  protected readonly activeSection = computed<AdminSection>(() => {
    const value = this.section();
    return (ADMIN_SECTIONS as readonly string[]).includes(value) ? (value as AdminSection) : 'resumen';
  });

  protected readonly copy = computed(() => SECTION_COPY[this.activeSection()]);

  protected readonly pendingVehicles = signal<BackendVehicle[]>([]);
  protected readonly approvedVehicles = signal<BackendVehicle[]>([]);
  protected readonly inactiveUsers = signal<BackendUser[]>([]);
  protected readonly incidents = this.incidentsApi.incidents;
  protected readonly openIncidents = computed(() => this.incidents().filter((incident) => incident.status === 'open'));

  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  /** Lo que se está cambiando (una placa o un id), para no enviarlo dos veces. */
  protected readonly busy = signal<string | null>(null);

  constructor() {
    void this.refresh();
  }

  /** Vuelve a consultar las tres listas; si una falla, las demás se muestran igual. */
  protected async refresh(): Promise<void> {
    this.loadError.set(null);
    const results = await Promise.allSettled([this.loadVehicles(), this.loadUsers(), this.incidentsApi.load()]);

    if (results.some((result) => result.status === 'rejected')) {
      this.loadError.set(LOAD_ERROR);
    }
  }

  /** Da permiso para entrar al parqueadero. */
  protected authorizeVehicle(plate: string): Promise<void> {
    return this.change(plate, async () => {
      await this.vehiclesApi.authorize(plate);
      await this.loadVehicles();
    });
  }

  /** Quita el permiso para entrar. */
  protected deauthorizeVehicle(plate: string): Promise<void> {
    return this.change(plate, async () => {
      await this.vehiclesApi.deauthorize(plate);
      await this.loadVehicles();
    });
  }

  /** Reactiva a un usuario dado de baja. */
  protected restoreUser(id: string): Promise<void> {
    return this.change(id, async () => {
      await this.usersApi.restore(id);
      await this.loadUsers();
    });
  }

  protected statusLabel(incident: Incident): string {
    return INCIDENT_STATUS_LABELS[incident.status];
  }

  /** El backend guarda el tipo como texto suelto (lo valida Joi, no TypeScript). */
  protected vehicleLabel(type: string): string {
    return vehicleLabel(type as VehicleType);
  }

  private async change(key: string, action: () => Promise<void>): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.actionError.set(null);
    this.busy.set(key);

    try {
      await action();
    } catch {
      this.actionError.set(ACTION_ERROR);
    } finally {
      this.busy.set(null);
    }
  }

  private async loadVehicles(): Promise<void> {
    const [pending, approved] = await Promise.all([this.vehiclesApi.deauthorized(), this.vehiclesApi.authorized()]);
    this.pendingVehicles.set(pending);
    this.approvedVehicles.set(approved);
  }

  private async loadUsers(): Promise<void> {
    this.inactiveUsers.set(await this.usersApi.listInactive());
  }
}
