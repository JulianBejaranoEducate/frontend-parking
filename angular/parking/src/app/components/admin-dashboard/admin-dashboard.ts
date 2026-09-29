import { NgTemplateOutlet, DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VehicleApiService, BackendVehicle } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { AdminApiService, BackendUser } from '../../core/services/admin-api.service';
import { IncidentService } from '../../core/services/incident.service';
import { ADMIN_SECTIONS, type AdminSection } from './admin-navigation';

const SECTION_COPY: Record<AdminSection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Lo que requiere tu atencion hoy.' },
  pendientes: { title: 'Vehiculos Pendientes', subtitle: 'Solicitudes de registro de vehiculos.' },
  aprobados: { title: 'Vehiculos Aprobados', subtitle: 'Registros habilitados para ingresar al parqueadero.' },
  usuarios: { title: 'Usuarios Pendientes', subtitle: 'Usuarios que estan esperando activacion.' },
  incidencias: { title: 'Incidencias', subtitle: 'Novedades reportadas dentro del parqueadero.' },
};

@Component({
  imports: [DatePipe],
  selector: 'app-admin-dashboard',
  styleUrl: './admin-dashboard.css',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit {
  readonly section = input.required<AdminSection>();
  protected readonly sectionCopy = SECTION_COPY;

  private readonly vehicleApi = inject(VehicleApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly incidentApi = inject(IncidentService);
  private readonly router = inject(Router);

  protected readonly pendingVehicles = signal<BackendVehicle[]>([]);
  protected readonly approvedVehicles = signal<BackendVehicle[]>([]);
  protected readonly unactiveUsers = signal<BackendUser[]>([]);
  protected readonly incidents = this.incidentApi.incidents;

  async ngOnInit() {
    await Promise.all([
      this.loadVehicles(),
      this.loadUsers(),
      this.incidentApi.loadIncidents(),
    ]);
  }

  private async loadVehicles() {
    const deauthorized = await this.vehicleApi.deauthorized();
    this.pendingVehicles.set(deauthorized);
  }

  private async loadUsers() {
    this.unactiveUsers.set(await this.adminApi.getUnactiveUsers());
  }

  async authorizeVehicle(plate: string) {
    await this.vehicleApi.authorize(plate);
    await this.loadVehicles();
  }

  async deauthorizeVehicle(plate: string) {
    await this.vehicleApi.deauthorize(plate);
    await this.loadVehicles();
  }

  async activateUser(id: string) {
    await this.adminApi.activateUser(id);
    await this.loadUsers();
  }

  async deactivateUser(id: string) {
    await this.adminApi.deactivateUser(id);
    await this.loadUsers();
  }
}