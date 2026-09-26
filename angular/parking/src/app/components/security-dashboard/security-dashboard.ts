import { Component, computed, inject, input, signal } from '@angular/core';
import { type VehicleType, vehicleLabel } from '../../core/models/vehicle';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
import { dayAndTime } from '../../core/utils/dates';
import { LectorCodigoQr } from '../lector-codigo-qr/lector-codigo-qr';
import { SECURITY_SECTIONS, type SecuritySection } from './security-navigation';

const SECTION_COPY: Record<SecuritySection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Vehículos que están dentro del parqueadero ahora mismo.' },
  control: {
    title: 'Control de acceso',
    subtitle: 'Escanea o escribe el código del visitante o del vehículo institucional.',
  },
};

/** Un elemento de la lista de "dentro ahora", sea visitante o vehículo institucional. */
interface InsideItem {
  key: string;
  kind: 'visitante' | 'institucional';
  title: string;
  personLabel: string;
  vehicleLabel: string;
  /** Solo se conoce para visitantes: el backend no guarda cuándo entró un vehículo institucional. */
  enteredAt: Date | null;
}

/** Lo que se encontró al escanear o buscar un código, listo para que el guardia actúe. */
type ScanResult =
  | { kind: 'visitante'; visitor: BackendVisitor }
  | { kind: 'institucional'; vehicle: BackendVehicle; inside: boolean };

/**
 * Dashboard del personal de seguridad (fase de conexión; ver "Conexión
 * frontend-backend" en planeacion-desarrollo.md).
 *
 * Se redujo a lo que hoy tiene una API real detrás: ver quién está dentro
 * (visitantes y usuarios institucionales, combinados) y escanear un código
 * para registrar un ingreso o una salida. El resto de la especificación
 * original (cupos, turnos, movimientos históricos) vuelve cuando el backend
 * tenga esas APIs — hoy solo existen los módulos de Vehículos, Visitantes y
 * Usuarios.
 *
 * Reglas de negocio de esta fase (impuestas por el backend, que no se puede
 * modificar):
 * - Un visitante "entra" al crear su registro (el formulario ya lo hace); acá
 *   solo se confirma su salida.
 * - Un vehículo institucional entra y sale con las mismas dos acciones que ya
 *   existían para autorizarlo (`PATCH`) y desautorizarlo (`DELETE`); el
 *   guardia nunca elige cuál: se decide sola según si está dentro o no.
 */
@Component({
  imports: [LectorCodigoQr],
  selector: 'app-security-dashboard',
  styleUrl: './security-dashboard.css',
  templateUrl: './security-dashboard.html',
})
export class SecurityDashboard {
  /** Parámetro de ruta :section. */
  readonly section = input<string>('resumen');

  private readonly visitorApi = inject(VisitorApiService);
  private readonly vehicleApi = inject(VehicleApiService);

  protected readonly vehicleLabel = (type: string) => vehicleLabel(type as VehicleType);
  protected readonly dayAndTime = dayAndTime;
  /** Las fechas llegan como texto ISO desde el backend; los formatos de fecha piden un Date real. */
  protected readonly asDate = (value: string) => new Date(value);

  protected readonly activeSection = computed<SecuritySection>(() => {
    const value = this.section();
    return (SECURITY_SECTIONS as readonly string[]).includes(value) ? (value as SecuritySection) : 'resumen';
  });

  protected readonly copy = computed(() => SECTION_COPY[this.activeSection()]);

  protected readonly flash = signal<string | null>(null);

  // ---- Resumen: quién está dentro, de verdad -------------------------------------------------

  protected readonly insideLoading = signal(false);
  protected readonly insideError = signal<string | null>(null);
  protected readonly insideItems = signal<InsideItem[]>([]);

  constructor() {
    void this.loadInside();
  }

  /** Trae, del backend real, los visitantes y los vehículos institucionales que están dentro. */
  protected async loadInside(): Promise<void> {
    this.insideLoading.set(true);
    this.insideError.set(null);

    try {
      const [visitors, vehicles] = await Promise.all([this.visitorApi.findAll(), this.vehicleApi.inside()]);

      const visitorItems: InsideItem[] = visitors
        .filter((visitor) => !visitor.exited_at)
        .map((visitor) => ({
          key: `visitante-${visitor.id}`,
          kind: 'visitante',
          // El backend devuelve '' (no null) cuando el visitante no tiene placa.
          title: visitor.plate_vehicle_visitor || this.vehicleLabel(visitor.type_vehicle),
          personLabel: `${visitor.first_name} ${visitor.last_name}`,
          vehicleLabel: this.vehicleLabel(visitor.type_vehicle),
          enteredAt: new Date(visitor.created_at),
        }));

      const vehicleItems: InsideItem[] = vehicles.map((vehicle) => ({
        key: `vehiculo-${vehicle.plate}`,
        kind: 'institucional',
        title: vehicle.plate,
        personLabel: vehicle.owner.name_user,
        vehicleLabel: this.vehicleLabel(vehicle.type),
        enteredAt: null,
      }));

      this.insideItems.set([...visitorItems, ...vehicleItems]);
    } catch {
      this.insideError.set('No pudimos consultar el backend. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.insideLoading.set(false);
    }
  }

  protected readonly visitorsInside = computed(() => this.insideItems().filter((item) => item.kind === 'visitante').length);
  protected readonly institutionalInside = computed(
    () => this.insideItems().filter((item) => item.kind === 'institucional').length,
  );

  // ---- Control de acceso: escanear o escribir el código --------------------------------------

  protected readonly manualCode = signal('');
  protected readonly scanning = signal(false);
  protected readonly scanError = signal<string | null>(null);
  protected readonly result = signal<ScanResult | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected setManualCode(event: Event): void {
    this.manualCode.set((event.target as HTMLInputElement).value);
  }

  protected submitManualCode(event: Event): void {
    event.preventDefault();
    const code = this.manualCode().trim();

    if (code) {
      void this.lookup(code);
    }
  }

  /** Recibe el texto leído del QR, sea de un visitante o de un vehículo institucional. */
  protected onQrRead(code: string): void {
    void this.lookup(code);
  }

  /**
   * Busca el código en Visitantes o en Vehículos, según su forma: el id de un
   * visitante es un número; la placa de un vehículo institucional no lo es.
   */
  private async lookup(code: string): Promise<void> {
    this.scanError.set(null);
    this.actionError.set(null);
    this.result.set(null);
    this.scanning.set(true);

    try {
      if (/^\d+$/.test(code)) {
        const visitor = await this.visitorApi.findById(Number(code));
        this.result.set({ kind: 'visitante', visitor });
      } else {
        const found = await this.vehicleApi.findByPlate(code.toUpperCase());

        if (!found) {
          this.scanError.set('Ese código no corresponde a ningún visitante ni a ningún vehículo institucional.');
          return;
        }

        this.result.set({ kind: 'institucional', vehicle: found.vehicle, inside: found.inside });
      }
    } catch {
      this.scanError.set('Ese código no corresponde a ningún visitante ni a ningún vehículo institucional.');
    } finally {
      this.scanning.set(false);
    }
  }

  /** El guardia confirma la única acción que corresponde según lo que se encontró. */
  protected async confirm(): Promise<void> {
    const current = this.result();

    if (!current) {
      return;
    }

    this.actionError.set(null);

    try {
      if (current.kind === 'visitante') {
        const visitor = await this.visitorApi.registerExit(current.visitor.id);
        this.result.set({ kind: 'visitante', visitor });
        this.flash.set(`Salida registrada: ${visitor.first_name} ${visitor.last_name}.`);
      } else if (current.inside) {
        await this.vehicleApi.registerExit(current.vehicle.plate);
        this.result.set({ kind: 'institucional', vehicle: current.vehicle, inside: false });
        this.flash.set(`Salida registrada: ${current.vehicle.plate}.`);
      } else {
        await this.vehicleApi.authorize(current.vehicle.plate);
        this.result.set({ kind: 'institucional', vehicle: current.vehicle, inside: true });
        this.flash.set(`Ingreso registrado: ${current.vehicle.plate}.`);
      }

      void this.loadInside();
    } catch {
      this.actionError.set('No pudimos registrar el movimiento. Revisa la conexión con el backend.');
    }
  }

  /** Cierra la tarjeta de resultado y limpia el campo de búsqueda manual. */
  protected closeResult(): void {
    this.result.set(null);
    this.scanError.set(null);
    this.actionError.set(null);
    this.manualCode.set('');
  }
}
