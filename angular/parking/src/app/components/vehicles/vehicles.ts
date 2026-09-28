import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { type DashboardVehicle, toDashboardVehicle, vehicleDetails, vehicleTitle } from '../../core/models/vehicle';
import { AuthService, SEEDED_OWNER_UID } from '../../core/services/auth.service';
import { StudentsApiService } from '../../core/services/modules/students-student-panel/students-api.sp.service';
import { VehiclesApiService } from '../../core/services/modules/vehicles-student-panel/vehicles-api.sp.service';

/**
 * "Vehículos" del panel de estudiante (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * Es la versión completa de "Mis vehículos" (que en `/inicio` sigue siendo un
 * resumen): mismos datos reales, `GET /users/:id` vía `StudentsApiService`,
 * sin necesidad de Firebase (mismo `SEEDED_OWNER_UID` mientras dure el modo
 * demostración). Lo que agrega esta pantalla es el código QR de cada
 * vehículo, para mostrarlo en portería.
 *
 * El QR codifica `vehicle.id` (la placa tal cual la tiene el backend, sea una
 * placa real o el identificador que le asigna a lo que no lleva placa) — es
 * lo único que expone hoy el módulo de Vehículos para identificarlo
 * (PEN-018 en planeacion-desarrollo.md: falta confirmar con el backend si es
 * lo que de verdad va a leer portería).
 *
 * El QR se muestra en un `<dialog>` nativo. No hay forma de impedir una
 * captura de pantalla real desde una página web (ni como PWA instalada): eso
 * solo se puede restringir con una app nativa (ADR-015, todavía sin decidir).
 * Lo que sí hace este panel es una fricción menor —desactivar clic derecho o
 * mantener presionado sobre la imagen—, no una garantía de seguridad.
 */
@Component({
  imports: [],
  selector: 'app-vehicles',
  styleUrl: './vehicles.css',
  templateUrl: './vehicles.html',
})
export class Vehicles {
  private readonly auth = inject(AuthService);
  private readonly studentsApi = inject(StudentsApiService);
  private readonly vehicleApi = inject(VehiclesApiService);

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly vehicles = signal<DashboardVehicle[]>([]);

  // ---- Código QR ------------------------------------------------------------------

  protected readonly qrDialog = viewChild.required<ElementRef<HTMLDialogElement>>('qrDialog');
  protected readonly qrVehicle = signal<DashboardVehicle | null>(null);
  protected readonly qrLoading = signal(false);
  protected readonly qrError = signal<string | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const uid = this.auth.demoMode ? SEEDED_OWNER_UID : (this.auth.user()?.uid ?? '');
      const student = await this.studentsApi.findById(uid);
      this.vehicles.set(student.vehicles.map(toDashboardVehicle));
    } catch {
      this.error.set('No pudimos consultar tus vehículos. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  protected statusLabel(vehicle: DashboardVehicle): string {
    return vehicle.isAuthorized ? 'Activo' : 'Inactivo';
  }

  protected async showQr(vehicle: DashboardVehicle): Promise<void> {
    this.qrVehicle.set(vehicle);
    this.qrError.set(null);
    this.qrDataUrl.set(null);
    this.qrLoading.set(true);
    this.qrDialog().nativeElement.showModal();

    try {
      this.qrDataUrl.set(await this.vehicleApi.renderQrCode(vehicle.id));
    } catch {
      this.qrError.set('No pudimos generar el código QR. Inténtalo de nuevo.');
    } finally {
      this.qrLoading.set(false);
    }
  }

  protected closeQr(): void {
    this.qrDialog().nativeElement.close();
  }

  /** Limpia el estado sin importar cómo se cerró: el botón, Escape o el fondo. */
  protected onQrDialogClosed(): void {
    this.qrVehicle.set(null);
    this.qrDataUrl.set(null);
    this.qrError.set(null);
  }

  /** El `<dialog>` nativo recibe el clic en el fondo; solo se cierra si no fue en el contenido. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.qrDialog().nativeElement) {
      this.closeQr();
    }
  }
}
