import { PlateScannerService } from '../../core/services/modules/security-dashboard/plate-scanner.service';
import { IncidentService } from '../../core/services/incident.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import type { ParkingZone } from '../../core/models/parking';
import { VEHICLE_TYPES, type VehicleType, vehicleLabel } from '../../core/models/vehicle';
import {
  type BackendAccessRecord,
  type BackendParkingZone,
  ParkingApiService,
} from '../../core/services/modules/security-dashboard/parking-api.service';
import { type BackendVehicle, VehicleApiService } from '../../core/services/modules/security-dashboard/vehicle-api.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/modules/visitors/visitor-api.service';
import { dayAndTime } from '../../core/utils/dates';
import { LectorCodigoQr } from '../lector-codigo-qr/lector-codigo-qr';
import { ZoneAvailability } from '../zone-availability/zone-availability';
import { SECURITY_SECTIONS, type SecuritySection } from './security-navigation';

const SECTION_COPY: Record<SecuritySection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Ocupacin del parqueadero en este momento.' },
  control: {
    title: 'Control de acceso',
    subtitle: 'Escanea el cdigo del visitante o de la comunidad, o bscalo por documento o placa.',
  },
  incidencias: { title: 'Reportar Novedad', subtitle: 'Crea una incidencia para que sea revisada por administracin.' }
};

/** Cómo se nombra cada tipo de vehículo en plural: "Zona de motos", "3 bicicletas". */
const PLURALS: Record<VehicleType, string> = { moto: 'motos', bicicleta: 'bicicletas', scooter: 'scooters' };

/** Los documentos colombianos tienen de 6 a 11 dígitos; el id de un visitante es más corto. */
const DOCUMENT_NUMBER_PATTERN = /^\d{6,11}$/;

const NOT_FOUND = 'Ese código no corresponde a ningún visitante ni a ningún vehículo de la comunidad.';

/** Cuántos elementos se muestran por página en "Dentro ahora". */
const PAGE_SIZE = 7;

type OwnerFilter = 'all' | 'visitante' | 'institucional';
type VehicleTypeFilter = 'all' | VehicleType;

/** Un elemento de "Dentro ahora": un registro de acceso abierto, con los datos de quién entró. */
interface InsideItem {
  key: string;
  kind: 'visitante' | 'institucional';
  /** La placa, o el tipo de vehículo cuando no tiene. */
  title: string;
  personLabel: string;
  /** Tipo sin traducir, para filtrar; `vehicleLabel` es el texto que se muestra. */
  vehicleType: string;
  vehicleLabel: string;
  /** Solo lo tienen los visitantes: un vehículo de la comunidad no expone el documento de su dueño. */
  documentNumber: string | null;
  enteredAt: Date;
}

/** Un ingreso o una salida que el backend ya confirmó. */
interface AccessOutcome {
  direction: 'ingreso' | 'salida';
  at: Date;
}

/** Lo que se encontró al escanear o buscar, listo para que el guardia actúe. */
type ScanResult =
  | { kind: 'visitante'; visitor: BackendVisitor; outcome: AccessOutcome | null }
  | { kind: 'institucional'; vehicle: BackendVehicle; outcome: AccessOutcome | null };

function vehiclePlural(type: string): string {
  return PLURALS[type as VehicleType] ?? type;
}

function toParkingZone(zone: BackendParkingZone): ParkingZone {
  return {
    id: String(zone.id),
    name: `Zona de ${vehiclePlural(zone.vehicleType)}`,
    accepts: zone.vehicleType as VehicleType,
    capacity: zone.totalCapacity,
    occupied: zone.totalCapacity - zone.availableSpaces,
  };
}

/** El backend explica por qué rechazó un ingreso o una salida en `details`. */
function backendMessage(error: unknown, fallback: string): string {
  const details: unknown = error instanceof HttpErrorResponse ? error.error?.details : undefined;
  return typeof details === 'string' ? details : fallback;
}

/**
 * Dashboard del personal de seguridad, conectado al backend real (ADR-020 y
 * ADR-021 en planeacion-desarrollo.md).
 *
 * - Resumen: ocupación real de las zonas de parqueo y quién está dentro (los
 *   registros de acceso sin salida), con búsqueda, filtros y paginación.
 * - Control de acceso: el QR del visitante es su llave; escanearlo y registrar
 *   el ingreso abre su registro de acceso, y la salida lo cierra. Lo mismo con
 *   la placa de un vehículo de la comunidad. El guardia ve las dos acciones y
 *   el backend rechaza la que no corresponde, con su motivo.
 */
@Component({
  imports: [LectorCodigoQr, ZoneAvailability],
  selector: 'app-security-dashboard',
  styleUrl: './security-dashboard.css',
  templateUrl: './security-dashboard.html',
})
export class SecurityDashboard {
  /** Parámetro de ruta :section. */
  readonly section = input<string>('resumen');

  private readonly visitorApi = inject(VisitorApiService);
  private readonly incidentApi = inject(IncidentService);
  private readonly plateScanner = inject(PlateScannerService);
  private readonly vehicleApi = inject(VehicleApiService);
  private readonly parkingApi = inject(ParkingApiService);

  protected readonly vehicleLabel = (type: string) => vehicleLabel(type as VehicleType);
  protected readonly dayAndTime = dayAndTime;
  /** Las fechas llegan como texto ISO desde el backend; los formatos de fecha piden un Date real. */
  protected readonly asDate = (value: string) => new Date(value);
  protected readonly ownerName = (vehicle: BackendVehicle) => vehicle.owner?.name ?? 'Dueño no disponible';

  protected readonly activeSection = computed<SecuritySection>(() => {
    const value = this.section();
    return (SECURITY_SECTIONS as readonly string[]).includes(value) ? (value as SecuritySection) : 'resumen';
  });

  protected readonly copy = computed(() => SECTION_COPY[this.activeSection()]);

  protected readonly flash = signal<string | null>(null);

  // ---- Resumen: ocupación real de las zonas --------------------------------------------------

  protected readonly zonesLoading = signal(false);
  protected readonly zonesError = signal<string | null>(null);
  protected readonly zones = signal<ParkingZone[]>([]);

  protected readonly totalCapacity = computed(() => this.zones().reduce((total, zone) => total + zone.capacity, 0));
  protected readonly occupiedSpots = computed(() => this.zones().reduce((total, zone) => total + zone.occupied, 0));
  protected readonly freeSpots = computed(() => this.totalCapacity() - this.occupiedSpots());

  constructor() {
    void this.refresh();
  }

  /** Vuelve a consultar la ocupación y quién está dentro, juntas para que las cifras coincidan. */
  protected async refresh(): Promise<void> {
    await Promise.all([this.loadZones(), this.loadInside()]);
  }

  /** Trae del backend la capacidad y los puestos libres de cada zona. */
  private async loadZones(): Promise<void> {
    this.zonesLoading.set(true);
    this.zonesError.set(null);

    try {
      const zones = await this.parkingApi.zones();
      this.zones.set([...zones].sort((a, b) => a.id - b.id).map(toParkingZone));
    } catch {
      // Sin respuesta, la última ocupación conocida ya no es confiable.
      this.zones.set([]);
      this.zonesError.set('No pudimos consultar el backend. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.zonesLoading.set(false);
    }
  }

  // ---- Resumen: quién está dentro ------------------------------------------------------------

  protected readonly insideLoading = signal(false);
  /** true cuando hay una respuesta del backend: una lista vacía también es un dato. */
  protected readonly insideLoaded = signal(false);
  protected readonly insideError = signal<string | null>(null);
  protected readonly insideItems = signal<InsideItem[]>([]);

  protected readonly visitorsInside = computed(() => this.insideItems().filter((item) => item.kind === 'visitante').length);
  protected readonly institutionalInside = computed(
    () => this.insideItems().filter((item) => item.kind === 'institucional').length,
  );

  /**
   * Los registros abiertos dicen quién entró (id del visitante o placa); los
   * nombres salen de Visitantes y de Vehículos.
   */
  public async submitIncident(event: Event, title: string, description: string, severity: any, plate: string) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await this.incidentApi.report({ title, description, severity, plate: plate || null, zoneName: 'General', reportedBy: 'Guardia' } as any);
    this.flash.set('Incidencia reportada correctamente.');
  }

  private async loadInside(): Promise<void> {
    this.insideLoading.set(true);
    this.insideError.set(null);

    try {
      const [records, visitors, vehicles] = await Promise.all([
        this.parkingApi.openRecords(),
        this.visitorApi.findAll(),
        this.vehicleApi.authorized(),
      ]);
      const visitorsById = new Map(visitors.map((visitor) => [visitor.id, visitor]));
      const vehiclesByPlate = new Map(vehicles.map((vehicle) => [vehicle.plate, vehicle]));

      this.insideItems.set(records.map((record) => this.toInsideItem(record, visitorsById, vehiclesByPlate)));
      this.insideLoaded.set(true);
    } catch {
      this.insideItems.set([]);
      this.insideLoaded.set(false);
      this.insideError.set('No pudimos consultar quién está dentro. Revisa la conexión con el backend.');
    } finally {
      this.insideLoading.set(false);
    }
  }

  private toInsideItem(
    record: BackendAccessRecord,
    visitorsById: Map<number, BackendVisitor>,
    vehiclesByPlate: Map<string, BackendVehicle>,
  ): InsideItem {
    const common = {
      key: `acceso-${record.id}`,
      vehicleType: record.zoneType,
      vehicleLabel: this.vehicleLabel(record.zoneType),
      enteredAt: new Date(record.entryDateTime),
    };

    if (record.visitorId !== null) {
      const visitor = visitorsById.get(record.visitorId);
      return {
        ...common,
        kind: 'visitante',
        title: record.plate || common.vehicleLabel,
        personLabel: visitor ? `${visitor.first_name} ${visitor.last_name}` : 'Visitante',
        documentNumber: visitor?.document_number ?? null,
      };
    }

    const vehicle = record.plate ? vehiclesByPlate.get(record.plate) : undefined;
    return {
      ...common,
      kind: 'institucional',
      title: record.plate ?? common.vehicleLabel,
      personLabel: vehicle ? this.ownerName(vehicle) : 'Dueño no disponible',
      documentNumber: null,
    };
  }

  // ---- Resumen: búsqueda, filtros, orden y paginación de "Dentro ahora" -----------------------

  protected readonly vehicleTypeOptions = VEHICLE_TYPES;
  protected readonly searchQuery = signal('');
  protected readonly ownerFilter = signal<OwnerFilter>('all');
  protected readonly vehicleTypeFilter = signal<VehicleTypeFilter>('all');
  protected readonly page = signal(1);

  /**
   * `insideItems()` filtrada por los tres filtros a la vez (búsqueda, quién y
   * tipo de vehículo se combinan) y ordenada de la entrada más reciente a la
   * más antigua.
   */
  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const owner = this.ownerFilter();
    const vehicleType = this.vehicleTypeFilter();

    return this.insideItems()
      .filter((item) => owner === 'all' || item.kind === owner)
      .filter((item) => vehicleType === 'all' || item.vehicleType === vehicleType)
      .filter(
        (item) =>
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.personLabel.toLowerCase().includes(query) ||
          item.documentNumber?.includes(query),
      )
      .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime());
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / PAGE_SIZE)));
  /** La página pedida, recortada para que no quede fuera de rango si la lista cambia. */
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  protected readonly pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredItems().slice(start, start + PAGE_SIZE);
  });

  protected setSearchQuery(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected setOwnerFilter(event: Event): void {
    this.ownerFilter.set((event.target as HTMLSelectElement).value as OwnerFilter);
    this.page.set(1);
  }

  protected setVehicleTypeFilter(event: Event): void {
    this.vehicleTypeFilter.set((event.target as HTMLSelectElement).value as VehicleTypeFilter);
    this.page.set(1);
  }

  protected previousPage(): void {
    this.page.update((current) => Math.max(1, current - 1));
  }

  protected nextPage(): void {
    this.page.update((current) => Math.min(this.totalPages(), current + 1));
  }

  // ---- Control de acceso: escanear o buscar, y registrar el ingreso o la salida --------------

  protected readonly manualCode = signal('');
  protected readonly scanning = signal(false);
  protected readonly scanError = signal<string | null>(null);
  protected readonly result = signal<ScanResult | null>(null);
  /** Mientras el backend responde, para no registrar dos veces el mismo movimiento. */
  protected readonly acting = signal(false);
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

  /** Recibe el texto leído del QR: el id de un visitante o la placa de un vehículo de la comunidad. */
  protected onQrRead(code: string): void {
    void this.lookup(code);
  }

  /**
   * Un número es un documento (6 a 11 dígitos) o el id que lleva el QR del
   * visitante; cualquier otra cosa es una placa, primero de la comunidad y
   * después de un visitante.
   */
  private async lookup(code: string): Promise<void> {
    this.scanError.set(null);
    this.actionError.set(null);
    this.result.set(null);
    this.scanning.set(true);

    const normalized = code.trim().toUpperCase();

    try {
      if (/^\d+$/.test(normalized)) {
        const visitor =
          (DOCUMENT_NUMBER_PATTERN.test(normalized) ? await this.visitorApi.findLatestByDocument(normalized) : null) ??
          (await this.visitorApi.findById(Number(normalized)));
        this.result.set({ kind: 'visitante', visitor, outcome: null });
        return;
      }

      const vehicle = await this.vehicleApi.findByPlate(normalized);

      if (vehicle) {
        this.result.set({ kind: 'institucional', vehicle, outcome: null });
        return;
      }

      const visitor = await this.visitorApi.findLatestByPlate(normalized);

      if (visitor) {
        this.result.set({ kind: 'visitante', visitor, outcome: null });
        return;
      }

      this.scanError.set(NOT_FOUND);
    } catch {
      this.scanError.set(NOT_FOUND);
    } finally {
      this.scanning.set(false);
    }
  }

  protected registerEntry(): Promise<void> {
    return this.registerMovement('ingreso', (current) =>
      current.kind === 'visitante'
        ? this.parkingApi.registerVisitorEntry(current.visitor.id)
        : this.parkingApi.registerVehicleEntry(current.vehicle.plate),
    );
  }

  protected registerExit(): Promise<void> {
    return this.registerMovement('salida', (current) =>
      current.kind === 'visitante'
        ? this.parkingApi.registerVisitorExit(current.visitor.id)
        : this.parkingApi.registerVehicleExit(current.vehicle.plate),
    );
  }

  private async registerMovement(
    direction: AccessOutcome['direction'],
    send: (current: ScanResult) => Promise<BackendAccessRecord>,
  ): Promise<void> {
    const current = this.result();

    if (!current || this.acting()) {
      return;
    }

    this.actionError.set(null);
    this.acting.set(true);

    try {
      const record = await send(current);
      const at = new Date((direction === 'ingreso' ? record.entryDateTime : record.exitDateTime) ?? Date.now());
      this.result.set({ ...current, outcome: { direction, at } });

      const who =
        current.kind === 'visitante' ? `${current.visitor.first_name} ${current.visitor.last_name}` : current.vehicle.plate;
      this.flash.set(direction === 'ingreso' ? `Ingreso registrado: ${who}.` : `Salida registrada: ${who}.`);

      void this.refresh();
    } catch (error) {
      this.actionError.set(backendMessage(error, 'No pudimos registrar el movimiento. Revisa la conexión con el backend.'));
    } finally {
      this.acting.set(false);
    }
  }

  /** Cierra la tarjeta de resultado y limpia el campo de búsqueda manual. */
  protected closeResult(): void {
    this.result.set(null);
    this.scanError.set(null);
    this.actionError.set(null);
    this.manualCode.set('');
  }

  // ---- Escaneo de placa con cA!mara y ML Kit ------------------------------------------

  protected readonly scanningPlate = signal(false);
  protected readonly plateError = signal<string | null>(null);

  protected async onScanPlate(): Promise<void> {
    if (this.scanningPlate()) {
      return;
    }

    this.plateError.set(null);
    this.scanError.set(null);
    this.actionError.set(null);
    this.result.set(null);
    this.scanningPlate.set(true);

    try {
      const plateResult = await this.plateScanner.scanPlate();

      if (!plateResult) {
        this.plateError.set(
          'No encontramos una placa legible en la foto. AcArcate mA!s, evita reflejos y que la placa ocupe la mayor parte de la imagen.',
        );
        return;
      }

      this.manualCode.set(plateResult.plate);
      void this.lookup(plateResult.plate);
    } catch (error) {
      this.plateError.set((error as Error).message);
    } finally {
      this.scanningPlate.set(false);
    }
  }
}