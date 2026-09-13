import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { createDrawerState } from '../../core/layout/drawer-state';
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  type Incident,
  type IncidentStatus,
} from '../../core/models/incident';
import { timeAgo } from '../../core/models/notification';
import { formatDuration } from '../../core/models/parking';
import { type VehicleType, vehicleDetails, vehicleLabel, vehicleTitle } from '../../core/models/vehicle';
import {
  DOCUMENT_LABELS,
  DOCUMENT_REQUIREMENTS,
  REGISTRATION_STATUS_LABELS,
  REJECTION_REASONS,
  type DocumentKind,
  type NameMatch,
  type RegistrationDocument,
  type RegistrationStatus,
  type VehicleRegistration,
  compareNames,
  declaredFullName,
  latestReview,
  wasResubmitted,
} from '../../core/models/vehicle-registration';
import { DOCUMENT_TYPES } from '../../core/models/visitor-pass';
import { AFFILIATION_LABELS } from '../../core/services/auth.service';
import { IncidentService } from '../../core/services/incident.service';
import { ParkingStatsService } from '../../core/services/parking-stats.service';
import { ParkingService } from '../../core/services/parking.service';
import { RegistrationError, VehicleRegistrationService } from '../../core/services/vehicle-registration.service';
import { Header } from '../header/header';
import { Sidebar, type SidebarItem } from '../sidebar/sidebar';

export const ADMIN_SECTIONS = [
  'resumen',
  'pendientes',
  'aprobados',
  'rechazados',
  'actualizaciones',
  'estadisticas',
  'incidencias',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

type ListSection = Extract<AdminSection, 'pendientes' | 'aprobados' | 'rechazados' | 'actualizaciones'>;

const SECTION_COPY: Record<AdminSection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Lo que requiere tu atención hoy.' },
  pendientes: { title: 'Solicitudes pendientes', subtitle: 'Por revisar, de la que más tiempo lleva esperando a la más reciente.' },
  aprobados: { title: 'Vehículos aprobados', subtitle: 'Registros habilitados para ingresar al parqueadero.' },
  rechazados: { title: 'Solicitudes rechazadas', subtitle: 'Registros que no se aprobaron, con su motivo.' },
  actualizaciones: {
    title: 'Actualización de documentos',
    subtitle: 'Solicitudes esperando que la persona vuelva a enviar un documento.',
  },
  estadisticas: { title: 'Estadísticas de uso', subtitle: 'Cómo se usa el parqueadero en el periodo elegido.' },
  incidencias: { title: 'Incidencias', subtitle: 'Novedades reportadas dentro del parqueadero.' },
};

const SECTION_BY_STATUS: Record<RegistrationStatus, ListSection> = {
  pending: 'pendientes',
  approved: 'aprobados',
  rejected: 'rechazados',
  'needs-update': 'actualizaciones',
};

const ICONS = {
  resumen: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  pendientes: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16m-1 3v6l5 3 1-1.7-4-2.3V7z',
  aprobados: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-1.4 14.6L6 12l1.4-1.4 3.2 3.2 6-6L18 9.2z',
  rechazados:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m3.6 5L17 8.4 13.4 12l3.6 3.6-1.4 1.4-3.6-3.6L8.4 17 7 15.6 10.6 12 7 8.4 8.4 7l3.6 3.6z',
  actualizaciones:
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zm-7-7.2V18h2v-5.2l1.6 1.6L16 13l-4-4-4 4 1.4 1.4z',
  estadisticas: 'M4 20h16v2H4a2 2 0 0 1-2-2V3h2zm3-2V9h3v9zm5 0V4h3v14zm5 0v-6h3v6z',
  incidencias: 'M12 2 1 21h22zm0 4 7.5 13h-15zM11 10h2v5h-2zm0 6h2v2h-2z',
} satisfies Record<AdminSection, string>;

export interface ChecklistItem {
  id: string;
  label: string;
  /** Lo que declaró el usuario, para tenerlo a la vista mientras se compara. */
  value?: string;
}

export const STATS_RANGES = [
  { days: 7, label: '7 días' },
  { days: 14, label: '14 días' },
  { days: 30, label: '30 días' },
] as const;

/** Umbral a partir del cual una zona se considera casi llena. */
const FILLING_THRESHOLD = 0.85;

/** Techo "redondo" para el eje: 137 → 150, 480 → 500. */
function niceMax(value: number): number {
  if (value <= 0) {
    return 10;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((candidate) => candidate * magnitude >= value) ?? 10;

  return step * magnitude;
}

@Component({
  imports: [Header, NgTemplateOutlet, RouterLink, Sidebar],
  selector: 'app-admin-dashboard',
  styleUrl: './admin-dashboard.css',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  /** Parámetro de ruta :section. */
  readonly section = input<string>('resumen');
  /** ?solicitud=<id> abre la revisión de esa solicitud. */
  readonly solicitud = input<string>();

  private readonly router = inject(Router);
  private readonly registrations = inject(VehicleRegistrationService);
  private readonly incidents = inject(IncidentService);
  private readonly stats = inject(ParkingStatsService);
  private readonly parking = inject(ParkingService);
  private readonly drawer = createDrawerState();

  protected readonly menuOpen = this.drawer.open;

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;
  protected readonly vehicleLabel = vehicleLabel;
  protected readonly rejectionReasons = REJECTION_REASONS;
  protected readonly statsRanges = STATS_RANGES;
  protected readonly vehicleTypes: readonly VehicleType[] = ['moto', 'bicicleta', 'scooter'];

  protected readonly activeSection = computed<AdminSection>(() => {
    const value = this.section();
    return (ADMIN_SECTIONS as readonly string[]).includes(value) ? (value as AdminSection) : 'resumen';
  });

  protected readonly copy = computed(() => SECTION_COPY[this.activeSection()]);

  protected readonly pending = this.registrations.pending;
  protected readonly needsUpdate = this.registrations.needsUpdate;
  protected readonly unresolvedIncidents = this.incidents.unresolved;

  protected readonly sidebarItems = computed<SidebarItem[]>(() => [
    { id: 'resumen', label: 'Resumen', icon: ICONS.resumen, route: '/admin/resumen' },
    {
      id: 'pendientes',
      label: 'Pendientes',
      icon: ICONS.pendientes,
      route: '/admin/pendientes',
      badge: this.pending().length,
      badgeLabel: 'por revisar',
    },
    { id: 'aprobados', label: 'Aprobados', icon: ICONS.aprobados, route: '/admin/aprobados' },
    { id: 'rechazados', label: 'Rechazados', icon: ICONS.rechazados, route: '/admin/rechazados' },
    // Sin contador: estas esperan a la persona, no a la administración.
    { id: 'actualizaciones', label: 'Actualizaciones', icon: ICONS.actualizaciones, route: '/admin/actualizaciones' },
    { id: 'estadisticas', label: 'Estadísticas', icon: ICONS.estadisticas, route: '/admin/estadisticas' },
    {
      id: 'incidencias',
      label: 'Incidencias',
      icon: ICONS.incidencias,
      route: '/admin/incidencias',
      badge: this.unresolvedIncidents().length,
      badgeLabel: 'sin resolver',
    },
  ]);

  /** Mensaje tras resolver una solicitud; también lo anuncia el lector de pantalla. */
  protected readonly flash = signal<string | null>(null);

  // ---- Resumen ---------------------------------------------------------------------------

  protected readonly oldestPending = computed(() => this.pending()[0] ?? null);
  protected readonly occupancyPercent = computed(() =>
    Math.round((this.parking.totalOccupied() / Math.max(1, this.parking.totalCapacity())) * 100),
  );
  protected readonly totalOccupied = this.parking.totalOccupied;
  protected readonly totalCapacity = this.parking.totalCapacity;

  // ---- Listas de solicitudes ----------------------------------------------------------------

  protected readonly query = signal('');
  protected readonly typeFilter = signal<'all' | VehicleType>('all');

  protected readonly listItems = computed(() => {
    const source: Record<ListSection, readonly VehicleRegistration[]> = {
      pendientes: this.pending(),
      aprobados: this.registrations.approved(),
      rechazados: this.registrations.rejected(),
      actualizaciones: this.needsUpdate(),
    };

    const section = this.activeSection();
    const items = section in source ? source[section as ListSection] : [];
    const type = this.typeFilter();
    const query = this.query().trim().toLowerCase();

    return items.filter((item) => {
      if (type !== 'all' && item.vehicle.type !== type) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        item.applicant.displayName,
        item.applicant.email,
        declaredFullName(item.owner),
        item.vehicle.plate,
        item.vehicle.brand,
        item.owner.documentNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  // ---- Revisión ---------------------------------------------------------------------------------

  protected readonly selected = computed(() => this.registrations.find(this.solicitud()) ?? null);

  private readonly reviewKey = computed(() => this.selected()?.id ?? '');

  protected readonly checks = linkedSignal<string, Record<string, boolean>>({
    source: this.reviewKey,
    computation: () => ({}),
  });

  protected readonly decision = linkedSignal<string, 'none' | 'reject' | 'update'>({
    source: this.reviewKey,
    computation: () => 'none',
  });

  protected readonly rejectReason = linkedSignal<string, string>({ source: this.reviewKey, computation: () => '' });
  protected readonly updateDocument = linkedSignal<string, DocumentKind | ''>({
    source: this.reviewKey,
    computation: () => '',
  });
  protected readonly decisionNote = linkedSignal<string, string>({ source: this.reviewKey, computation: () => '' });
  protected readonly decisionAttempted = linkedSignal<string, boolean>({
    source: this.reviewKey,
    computation: () => false,
  });
  protected readonly actionError = linkedSignal<string, string | null>({
    source: this.reviewKey,
    computation: () => null,
  });

  protected readonly documentIndex = linkedSignal<string, number>({ source: this.reviewKey, computation: () => 0 });
  protected readonly zoomed = linkedSignal<string, boolean>({ source: this.reviewKey, computation: () => false });
  protected readonly rotation = linkedSignal<string, number>({ source: this.reviewKey, computation: () => 0 });

  protected readonly activeDocument = computed<RegistrationDocument | null>(() => {
    const documents = this.selected()?.documents ?? [];
    return documents[Math.min(this.documentIndex(), documents.length - 1)] ?? null;
  });

  /** Primera validación, automática: nombres declarados frente a la cuenta. */
  protected readonly accountMatch = computed<NameMatch | null>(() => {
    const registration = this.selected();
    return registration
      ? compareNames(declaredFullName(registration.owner), registration.applicant.displayName)
      : null;
  });

  protected readonly duplicatePlate = computed(() => {
    const registration = this.selected();
    const plate = registration?.vehicle.plate;
    return Boolean(registration && plate && this.registrations.isPlateTaken(plate, registration.id));
  });

  /** Segunda validación, humana: qué comparar contra la foto del documento. */
  protected readonly checklist = computed<ChecklistItem[]>(() => {
    const registration = this.selected();

    if (!registration) {
      return [];
    }

    const { owner, vehicle, documents } = registration;
    const has = (kind: DocumentKind) => documents.some((document) => document.kind === kind);
    const documentType = DOCUMENT_TYPES.find((type) => type.value === owner.documentType)?.label;

    if (vehicle.type === 'moto') {
      const items: ChecklistItem[] = [
        { id: 'legible', label: 'La foto es legible y corresponde a una tarjeta de propiedad' },
        { id: 'owner', label: 'El propietario coincide con los nombres declarados', value: declaredFullName(owner) },
      ];

      if (owner.documentNumber) {
        items.push({
          id: 'owner-id',
          label: 'La identificación coincide',
          value: `${documentType ?? ''} ${owner.documentNumber}`.trim(),
        });
      }

      items.push(
        { id: 'plate', label: 'La placa coincide', value: vehicle.plate },
        { id: 'model', label: 'Marca y línea coinciden', value: [vehicle.brand, vehicle.line].filter(Boolean).join(' ') },
        { id: 'year', label: 'El modelo (año) coincide', value: vehicle.modelYear?.toString() },
        { id: 'color', label: 'El color coincide', value: vehicle.color },
      );

      return items;
    }

    if (vehicle.type === 'bicicleta') {
      return has('frame-serial')
        ? [
            { id: 'legible', label: 'La foto del serial es legible' },
            {
              id: 'serial',
              label: vehicle.frameSerial ? 'El serial de la foto coincide' : 'Revisé la foto del serial',
              value: vehicle.frameSerial,
            },
            { id: 'declared', label: 'Revisé la marca y el color declarados', value: vehicleDetails(vehicle) },
          ]
        : [{ id: 'declared', label: 'Revisé la marca y el color declarados', value: vehicleDetails(vehicle) }];
    }

    return has('purchase-proof')
      ? [
          { id: 'legible', label: 'La factura es legible' },
          { id: 'buyer', label: 'El comprador coincide con los datos declarados', value: declaredFullName(owner) },
        ]
      : [{ id: 'declared', label: 'Revisé los datos declarados', value: declaredFullName(owner) }];
  });

  protected readonly checkedCount = computed(
    () => this.checklist().filter((item) => this.checks()[item.id]).length,
  );

  protected readonly allChecked = computed(
    () => this.checklist().length > 0 && this.checkedCount() === this.checklist().length,
  );

  // ---- Estadísticas ---------------------------------------------------------------------------

  protected readonly statsDays = signal<number>(14);
  protected readonly daily = computed(() => this.stats.dailyEntries(this.statsDays()));
  protected readonly hourly = computed(() => this.stats.hourlyOccupancy(this.statsDays()));
  protected readonly typeUsage = computed(() => this.stats.typeUsage(this.statsDays()));
  protected readonly summary = computed(() => this.stats.summary(this.statsDays()));

  protected readonly dailyMax = computed(() => niceMax(Math.max(...this.daily().map((day) => day.entries))));
  protected readonly dailyTicks = computed(() => [0, 0.5, 1].map((ratio) => Math.round(this.dailyMax() * ratio)));
  protected readonly typeMax = computed(() => Math.max(1, ...this.typeUsage().map((item) => item.entries)));
  protected readonly fillingThreshold = FILLING_THRESHOLD * 100;

  /** Con 30 barras no caben 30 fechas: se rotula una de cada N. */
  protected readonly dailyLabelEvery = computed(() => (this.statsDays() <= 7 ? 1 : this.statsDays() <= 14 ? 2 : 5));

  // ---- Incidencias -----------------------------------------------------------------------------

  protected readonly incidentFilter = signal<'unresolved' | 'resolved' | 'all'>('unresolved');

  protected readonly filteredIncidents = computed(() => {
    const filter = this.incidentFilter();
    const items = this.incidents.items();

    return filter === 'all'
      ? items
      : items.filter((item) => (filter === 'resolved' ? item.status === 'resolved' : item.status !== 'resolved'));
  });

  // ---- Acciones de navegación --------------------------------------------------------------------

  protected toggleMenu(): void {
    this.drawer.toggle();
  }

  protected closeMenu(): void {
    this.drawer.closeOnMobile();
  }

  protected openReview(registration: VehicleRegistration): void {
    this.flash.set(null);
    void this.router.navigate(['/admin', SECTION_BY_STATUS[registration.status]], {
      queryParams: { solicitud: registration.id },
    });
  }

  protected closeReview(): void {
    void this.router.navigate(['/admin', this.activeSection()]);
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setTypeFilter(value: 'all' | VehicleType): void {
    this.typeFilter.set(value);
  }

  // ---- Acciones de revisión ----------------------------------------------------------------------

  protected toggleCheck(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checks.update((checks) => ({ ...checks, [id]: checked }));
  }

  protected chooseDecision(decision: 'none' | 'reject' | 'update'): void {
    this.decision.set(decision);
    this.decisionAttempted.set(false);
    this.actionError.set(null);
  }

  protected setText(target: 'rejectReason' | 'decisionNote', event: Event): void {
    this[target].set((event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
  }

  protected setUpdateDocument(event: Event): void {
    this.updateDocument.set((event.target as HTMLSelectElement).value as DocumentKind | '');
  }

  protected approve(): void {
    const registration = this.selected();

    if (!registration || !this.allChecked()) {
      return;
    }

    this.runDecision(() => this.registrations.approve(registration.id), `${vehicleTitle(registration.vehicle)} quedó aprobado.`);
  }

  protected confirmReject(): void {
    const registration = this.selected();
    this.decisionAttempted.set(true);

    if (!registration || !this.rejectReason()) {
      return;
    }

    this.runDecision(
      () => this.registrations.reject(registration.id, this.rejectReason(), this.decisionNote().trim() || undefined),
      `${vehicleTitle(registration.vehicle)} quedó rechazado.`,
    );
  }

  protected confirmRequestUpdate(): void {
    const registration = this.selected();
    this.decisionAttempted.set(true);
    const documentKind = this.updateDocument();

    if (!registration || !documentKind || !this.decisionNote().trim()) {
      return;
    }

    this.runDecision(
      () => this.registrations.requestUpdate(registration.id, documentKind, this.decisionNote().trim()),
      `Se pidió a ${registration.applicant.displayName} actualizar un documento.`,
    );
  }

  // ---- Visor de documentos -----------------------------------------------------------------------

  protected showDocument(index: number): void {
    this.documentIndex.set(index);
    this.zoomed.set(false);
    this.rotation.set(0);
  }

  protected rotate(): void {
    this.rotation.update((degrees) => (degrees + 90) % 360);
  }

  protected toggleZoom(): void {
    this.zoomed.update((zoomed) => !zoomed);
  }

  protected isImage(document: RegistrationDocument): boolean {
    return document.mimeType.startsWith('image/');
  }

  // ---- Incidencias -------------------------------------------------------------------------------

  protected setIncidentFilter(value: 'unresolved' | 'resolved' | 'all'): void {
    this.incidentFilter.set(value);
  }

  protected setIncidentStatus(incident: Incident, status: IncidentStatus): void {
    this.incidents.setStatus(incident.id, status);
  }

  /** La gravedad usa los colores de estado; siempre acompañada de icono y texto. */
  protected severityChip(incident: Incident): string {
    return { high: 'chip--critical', medium: 'chip--warning', low: 'chip--neutral' }[incident.severity];
  }

  // ---- Presentación ------------------------------------------------------------------------------

  protected timeAgo(date: Date): string {
    return timeAgo(date);
  }

  // Las filas se pintan con plantillas cuyo contexto llega sin tipo; estos
  // accesos devuelven la etiqueta con el tipo correcto.

  protected statusLabel(status: RegistrationStatus): string {
    return REGISTRATION_STATUS_LABELS[status];
  }

  protected documentLabel(kind: DocumentKind | undefined): string {
    return kind ? DOCUMENT_LABELS[kind] : '';
  }

  protected severityLabel(incident: Incident): string {
    return INCIDENT_SEVERITY_LABELS[incident.severity];
  }

  protected incidentStatusLabel(incident: Incident): string {
    return INCIDENT_STATUS_LABELS[incident.status];
  }

  protected formatDateTime(date: Date): string {
    return date.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  }

  protected affiliationLine(registration: VehicleRegistration): string {
    const { affiliation, program } = registration.applicant;
    const label = affiliation ? AFFILIATION_LABELS[affiliation] : null;
    return [label, program].filter(Boolean).join(' · ');
  }

  /** Separa el correo para que, en pantallas estrechas, se parta en la @ y no a mitad del dominio. */
  protected emailParts(email: string): [string, string] {
    const at = email.lastIndexOf('@');
    return at < 0 ? [email, ''] : [email.slice(0, at + 1), email.slice(at + 1)];
  }

  protected latestReview(registration: VehicleRegistration) {
    return latestReview(registration);
  }

  protected wasResubmitted(registration: VehicleRegistration): boolean {
    return wasResubmitted(registration);
  }

  protected nameMatchFor(registration: VehicleRegistration): NameMatch {
    return compareNames(declaredFullName(registration.owner), registration.applicant.displayName);
  }

  protected declaredName(registration: VehicleRegistration): string {
    return declaredFullName(registration.owner);
  }

  /** Documentos que se le pueden pedir de nuevo según el tipo de vehículo. */
  protected updatableDocuments(registration: VehicleRegistration): DocumentKind[] {
    return DOCUMENT_REQUIREMENTS[registration.vehicle.type].map((requirement) => requirement.kind);
  }

  protected documentTypeLabel(registration: VehicleRegistration): string {
    return DOCUMENT_TYPES.find((type) => type.value === registration.owner.documentType)?.label ?? '';
  }

  protected percent(ratio: number): number {
    return Math.round(ratio * 100);
  }

  protected barHeight(value: number, max: number): number {
    return max > 0 ? Math.max(1.5, (value / max) * 100) : 0;
  }

  protected dayLabel(date: Date): string {
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
  }

  protected fullDayLabel(date: Date): string {
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected hourLabel(hour: number): string {
    return `${hour}:00`;
  }

  protected durationLabel(minutes: number): string {
    return formatDuration(minutes * 60_000);
  }

  private runDecision(action: () => void, message: string): void {
    try {
      action();
      this.flash.set(message);
      this.closeReview();
    } catch (error) {
      this.actionError.set(error instanceof RegistrationError ? error.message : 'No se pudo guardar la decisión.');
    }
  }
}
