import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { type DashboardVehicle, vehicleDetails, vehicleTitle } from '../../core/models/vehicle';
import { StudentVehiclesService } from '../../core/services/student-panel/student-vehicles.service';
import { QR_CODE_RENDERER } from '../../core/utils/qr-code';

/**
 * "Vehículos" del panel de usuario.
 *
 * Es la versión completa de "Mis vehículos" (que en `/inicio` sigue siendo un
 * resumen): mismos datos reales, vía `StudentVehiclesService` (compartido con
 * `MainDashboard` y `RegisterVehicle`, para no repetir la consulta ni el uid
 * efectivo de cada uno por su cuenta). Lo que agrega esta pantalla es el
 * código QR de cada vehículo, para mostrarlo en portería.
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
  private readonly studentsService = inject(StudentVehiclesService);
  private readonly renderQrCode = inject(QR_CODE_RENDERER);

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;

  protected readonly loading = this.studentsService.loading;
  protected readonly error = this.studentsService.error;
  protected readonly vehicles = this.studentsService.vehicles;

  // ---- Código QR ------------------------------------------------------------------

  protected readonly qrDialog = viewChild.required<ElementRef<HTMLDialogElement>>('qrDialog');
  protected readonly qrVehicle = signal<DashboardVehicle | null>(null);
  protected readonly qrLoading = signal(false);
  protected readonly qrError = signal<string | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  constructor() {
    // La promesa la observan los signals de StudentVehiclesService; un rechazo no bloquea nada aquí.
    void this.studentsService.refresh().catch(() => {});
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
      this.qrDataUrl.set(await this.renderQrCode(vehicle.id));
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
