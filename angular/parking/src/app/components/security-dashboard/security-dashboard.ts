import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PARKING } from '../../core/config/parking.config';
import {
  ACCESS_RECORD_LABELS,
  type AccessCandidate,
  type AccessRecord,
  type RegisterOptions,
} from '../../core/models/access';
import {
  IDENTIFICATION_LABELS,
  MOVEMENT_LABELS,
  type ParkingMovement,
  type ParkingStay,
  type ParkingZone,
  ZONE_STATUS_LABELS,
  formatDuration,
  freeSpots,
  isLongStay,
  startOfDay,
  zoneStatus,
} from '../../core/models/parking';
import { SHIFT_STATUS_LABELS, type SecurityShift, shiftStatus, totalInside } from '../../core/models/shift';
import { type VehicleType, vehicleDetails, vehicleLabel, vehicleTitle } from '../../core/models/vehicle';
import { REGISTRATION_STATUS_LABELS, nameTokens } from '../../core/models/vehicle-registration';
import { AccessControlService, AccessError, normalizePlateQuery } from '../../core/services/access-control.service';
import { ShiftError, ShiftService } from '../../core/services/shift.service';
import { StayError, StayService } from '../../core/services/stay.service';
import { type BackendVisitor, VisitorApiService } from '../../core/services/visitor-api.service';
import { PassError } from '../../core/services/visitor-pass.service';
import { atClock, clockTime, dayAndTime, momentLabel } from '../../core/utils/dates';
import { AccessResult } from '../access-result/access-result';
import { LectorCodigoQr } from '../lector-codigo-qr/lector-codigo-qr';
import { ZoneAvailability } from '../zone-availability/zone-availability';
import { SECURITY_SECTIONS, type SecuritySection } from './security-navigation';

/** Aviso del resumen que requiere la atención del guardia. */
export interface SecurityAlert {
  id: string;
  /** critical: sin cupos; warning: casi lleno o estancia larga. */
  tone: 'warning' | 'critical';
  title: string;
  detail: string;
}

/** Cómo identifica el guardia el vehículo en «Control de acceso». */
export type ControlMode = 'buscar' | 'qr';

const SECTION_COPY: Record<SecuritySection, { title: string; subtitle: string }> = {
  resumen: { title: 'Resumen', subtitle: 'Disponibilidad del parqueadero en este momento.' },
  control: {
    title: 'Control de acceso',
    subtitle: 'Busca el vehículo o escanea el pase del visitante: el sistema decide si es ingreso o salida.',
  },
  dentro: { title: 'Vehículos dentro', subtitle: 'Todo lo que tiene un ingreso abierto, del que más tiempo lleva al más reciente.' },
  movimientos: { title: 'Movimientos', subtitle: 'Ingresos y salidas registrados en portería, con quién los registró.' },
  turno: { title: 'Turno', subtitle: `Toma, entrega y recibe el turno de la ${PARKING.postName.toLowerCase()}.` },
};

const PLURAL_LABELS: Record<VehicleType, string> = {
  moto: 'Motos',
  bicicleta: 'Bicicletas',
  scooter: 'Scooters',
};

/**
 * Dashboard del personal de seguridad (especificación en la sección 4 de
 * planeacion-desarrollo.md).
 *
 * - **Resumen**: vehículos dentro, puestos disponibles por tipo, alertas y
 *   últimos movimientos, más el estado del turno (Fase 1).
 * - **Control de acceso**: buscar por placa, documento o nombre, o escanear el
 *   QR del visitante; registrar, deshacer y acciones especiales (Fases 2 y 3).
 * - **Vehículos dentro** y **Movimientos**: listas con filtros; salida manual y
 *   anulación con motivo (Fase 2).
 * - **Turno**: tomar, entregar y recibir el turno (Fase 1, ADR-009).
 *
 * Las reglas viven en `AccessControlService`, `StayService` y `ShiftService`;
 * este componente las presenta y traduce sus errores en mensajes para el guardia.
 */
@Component({
  imports: [AccessResult, LectorCodigoQr, NgTemplateOutlet, RouterLink, ZoneAvailability],
  selector: 'app-security-dashboard',
  styleUrl: './security-dashboard.css',
  templateUrl: './security-dashboard.html',
})
export class SecurityDashboard {
  /** Parámetro de ruta :section. */
  readonly section = input<string>('resumen');
  /** ?buscar=<texto>: llega desde el buscador del header. */
  readonly buscar = input<string>();
  /** ?estancia=<id>: llega desde «Vehículos dentro» para registrar la salida. */
  readonly estancia = input<string>();

  private readonly staysStore = inject(StayService);
  private readonly shifts = inject(ShiftService);
  private readonly access = inject(AccessControlService);
  private readonly visitorApi = inject(VisitorApiService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly vehicleTitle = vehicleTitle;
  protected readonly vehicleDetails = vehicleDetails;
  protected readonly vehicleLabel = vehicleLabel;
  protected readonly totalInside = totalInside;
  protected readonly clockTime = clockTime;
  protected readonly atClock = atClock;
  protected readonly dayAndTime = dayAndTime;
  protected readonly momentLabel = momentLabel;
  protected readonly vehicleTypes: readonly VehicleType[] = ['moto', 'bicicleta', 'scooter'];

  protected readonly activeSection = computed<SecuritySection>(() => {
    const value = this.section();
    return (SECURITY_SECTIONS as readonly string[]).includes(value) ? (value as SecuritySection) : 'resumen';
  });

  protected readonly copy = computed(() => SECTION_COPY[this.activeSection()]);

  /** Confirmación de la última acción; también la anuncia el lector de pantalla. */
  protected readonly flash = signal<string | null>(null);

  /** Error de negocio de la última acción de turno (p. ej. otro guardia ya tomó el turno). */
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopUndoTicker());
  }

  // ---- Resumen ------------------------------------------------------------------------

  protected readonly zones = this.staysStore.zones;
  protected readonly inside = this.staysStore.inside;

  protected readonly visitorsInside = computed(
    () => this.inside().filter((stay) => stay.subject.kind === 'visitor').length,
  );

  protected readonly institutionalInside = computed(() => this.inside().length - this.visitorsInside());

  protected readonly capacity = computed(() => this.zones().reduce((total, zone) => total + zone.capacity, 0));
  protected readonly occupied = computed(() => this.zones().reduce((total, zone) => total + zone.occupied, 0));
  protected readonly available = computed(() => this.zones().reduce((total, zone) => total + freeSpots(zone), 0));

  /** Movimientos vigentes (sin los anulados). */
  private readonly validMovements = computed(() => this.staysStore.movements().filter((movement) => !movement.annulment));

  /** Ingresos y salidas vigentes desde las 00:00 de hoy. */
  protected readonly todayMovements = computed(() => {
    const from = startOfDay().getTime();
    return this.validMovements().filter((movement) => movement.at.getTime() >= from);
  });

  protected readonly todayEntries = computed(
    () => this.todayMovements().filter((movement) => movement.kind === 'entry').length,
  );

  protected readonly todayExits = computed(() => this.todayMovements().length - this.todayEntries());

  protected readonly latestMovements = computed(() => this.validMovements().slice(0, 6));

  /** Primero lo que bloquea (zonas sin cupo), luego lo que requiere atención. */
  protected readonly alerts = computed<SecurityAlert[]>(() => {
    const zoneAlerts = this.zones()
      .filter((zone) => zoneStatus(zone) !== 'available')
      .map((zone) => this.zoneAlert(zone))
      .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'critical' ? -1 : 1));

    const stayAlerts = this.inside()
      .filter((stay) => isLongStay(stay, PARKING.longStayHours))
      .map<SecurityAlert>((stay) => ({
        id: `stay-${stay.id}`,
        tone: 'warning',
        title: `${vehicleTitle(stay.vehicle)} lleva ${this.durationSince(stay.enteredAt)} dentro`,
        detail: `Ingresó ${dayAndTime(stay.enteredAt)} · ${stay.subject.fullName}`,
      }));

    return [...zoneAlerts, ...stayAlerts];
  });

  // ---- Control de acceso ------------------------------------------------------------------

  protected readonly mode = signal<ControlMode>('buscar');

  /**
   * Búsqueda escrita. Toma lo que llega del header (?buscar=) y conserva lo
   * escrito cuando ese parámetro se quita de la dirección.
   */
  protected readonly query = linkedSignal<string | undefined, string>({
    source: this.buscar,
    computation: (buscar, previous) => buscar ?? previous?.value ?? '',
  });
  protected readonly results = computed(() => this.access.search(this.query()));

  /**
   * Vehículo elegido. Llega también desde «Vehículos dentro» (?estancia=) y una
   * búsqueda nueva desde el header cierra la tarjeta abierta.
   *
   * Solo se reinicia cuando cambian esos parámetros: la búsqueda del candidato
   * va en `untracked` para que registrar cualquier movimiento no reemplace el
   * vehículo que el guardia eligió. La evaluación en vivo la hace `decision`.
   */
  protected readonly selected = linkedSignal<{ stayId?: string; buscar?: string }, AccessCandidate | null>({
    source: () => ({ stayId: this.estancia(), buscar: this.buscar() }),
    computation: ({ stayId, buscar }, previous) => {
      if (stayId) {
        return untracked(() => this.access.candidateForStay(stayId));
      }

      return buscar !== undefined ? null : (previous?.value ?? null);
    },
  });

  /** Evaluación en vivo del vehículo elegido: se actualiza si cambia el turno o la ocupación. */
  protected readonly decision = computed(() => {
    const candidate = this.selected();
    return candidate ? this.access.evaluate(candidate) : null;
  });

  protected readonly registerError = signal<string | null>(null);
  protected readonly qrError = signal<string | null>(null);

  /** Último registro, mientras se puede deshacer. */
  protected readonly lastRecord = signal<AccessRecord | null>(null);
  private readonly now = signal(Date.now());
  private ticker: ReturnType<typeof setInterval> | null = null;

  protected readonly undoSecondsLeft = computed(() => {
    const record = this.lastRecord();
    return record ? Math.max(0, Math.ceil((record.undoUntil.getTime() - this.now()) / 1000)) : 0;
  });

  /** Cambia entre buscar y escanear el pase, y olvida el error del último QR. */
  protected setMode(mode: ControlMode): void {
    this.mode.set(mode);
    this.qrError.set(null);
  }

  /** Toma lo que escribe el guardia en el buscador y cierra la tarjeta abierta. */
  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.selected.set(null);
    this.registerError.set(null);
    // Si la dirección conservara la búsqueda del header, repetirla desde allí no haría nada.
    this.clearParams('buscar', 'estancia');
  }

  /** Abre la tarjeta de resultado del vehículo elegido. */
  protected choose(candidate: AccessCandidate): void {
    this.selected.set(candidate);
    this.registerError.set(null);
    this.focusResult();
  }

  /** Cierra la tarjeta sin registrar y vuelve a la búsqueda. */
  protected cancelSelection(): void {
    this.selected.set(null);
    this.registerError.set(null);
    this.clearParams('estancia');
  }

  /**
   * Recibe el token leído del QR del visitante (Fase 3). Primero prueba con los
   * pases locales de demostración; si no aparece, puede ser un visitante real
   * ya guardado en el backend (fase de conexión), y se resuelve aparte porque
   * ese flujo todavía no tiene cupos, turno ni «deshacer» (ver `backendVisitor`).
   */
  protected onQrRead(token: string): void {
    const candidate = this.access.candidateForPass(token);

    if (candidate) {
      this.qrError.set(null);
      this.choose(candidate);
      return;
    }

    void this.loadBackendVisitor(token);
  }

  // ---- Visitante conectado al backend real (fase de conexión) --------------------------------

  protected readonly backendVisitor = signal<BackendVisitor | null>(null);
  protected readonly backendVisitorLoading = signal(false);
  protected readonly backendVisitorActionError = signal<string | null>(null);

  /** Busca el visitante por el id leído del QR. Si no existe en ningún lado, avisa. */
  private async loadBackendVisitor(id: string): Promise<void> {
    this.qrError.set(null);
    this.backendVisitorActionError.set(null);
    this.backendVisitor.set(null);
    this.backendVisitorLoading.set(true);

    try {
      this.backendVisitor.set(await this.visitorApi.findById(id));
    } catch {
      this.qrError.set(
        'El código leído no corresponde a ningún pase de visitante. Pide al visitante que lo genere desde el formulario.',
      );
    } finally {
      this.backendVisitorLoading.set(false);
    }
  }

  /** El guardia confirma el ingreso del visitante conectado al backend real. */
  protected async authorizeBackendVisitor(): Promise<void> {
    const visitor = this.backendVisitor();

    if (!visitor) {
      return;
    }

    this.backendVisitorActionError.set(null);

    try {
      this.backendVisitor.set(await this.visitorApi.authorize(visitor.id));
      this.flash.set(`Ingreso autorizado: ${visitor.first_name} ${visitor.last_name}.`);
    } catch {
      this.backendVisitorActionError.set('No pudimos autorizar el ingreso. Revisa la conexión con el backend.');
    }
  }

  /** El guardia registra la salida del visitante conectado al backend real. */
  protected async registerBackendVisitorExit(): Promise<void> {
    const visitor = this.backendVisitor();

    if (!visitor) {
      return;
    }

    this.backendVisitorActionError.set(null);

    try {
      this.backendVisitor.set(await this.visitorApi.registerExit(visitor.id));
      this.flash.set(`Salida registrada: ${visitor.first_name} ${visitor.last_name}.`);
    } catch {
      this.backendVisitorActionError.set('No pudimos registrar la salida. Revisa la conexión con el backend.');
    }
  }

  /** Cierra la tarjeta del visitante conectado al backend real. */
  protected closeBackendVisitor(): void {
    this.backendVisitor.set(null);
    this.backendVisitorActionError.set(null);
  }

  /**
   * El backend guarda el tipo de vehículo como texto suelto (lo valida Joi,
   * no TypeScript): aquí se confía en esa validación para reusar la etiqueta
   * ya traducida.
   */
  protected backendVehicleLabel(type: string): string {
    return vehicleLabel(type as VehicleType);
  }

  /** Registra lo que confirmó el guardia en la tarjeta de resultado. */
  protected onRegister(options: RegisterOptions): void {
    const decision = this.decision();

    if (!decision) {
      return;
    }

    try {
      const record = this.access.register(decision, options);
      this.lastRecord.set(record);
      this.selected.set(null);
      this.query.set('');
      this.registerError.set(null);
      this.flash.set(null);
      this.startUndoTicker();
      this.clearParams('estancia', 'buscar');
    } catch (error) {
      if (error instanceof AccessError || error instanceof StayError || error instanceof PassError) {
        this.registerError.set(error.message);
        return;
      }

      throw error;
    }
  }

  /** Deshace el último registro dentro de los 10 segundos. */
  protected undoLast(): void {
    const record = this.lastRecord();

    if (!record) {
      return;
    }

    try {
      this.access.undo(record);
      this.flash.set(`Se deshizo: ${ACCESS_RECORD_LABELS[record.kind].toLowerCase()} de ${vehicleTitle(record.stay.vehicle)}.`);
    } catch (error) {
      if (!(error instanceof AccessError)) {
        throw error;
      }

      this.flash.set(error.message);
    } finally {
      this.lastRecord.set(null);
      this.stopUndoTicker();
    }
  }

  /** Oculta el aviso del último registro cuando ya no se puede deshacer. */
  protected dismissRecord(): void {
    this.lastRecord.set(null);
    this.stopUndoTicker();
  }

  /** Ej. "Ingreso registrado" o "Salida registrada sin ingreso". */
  protected recordLabel(record: AccessRecord): string {
    return ACCESS_RECORD_LABELS[record.kind];
  }

  /** Estado del candidato en la lista de resultados. */
  protected candidateStatus(candidate: AccessCandidate): string {
    if (candidate.openStay) {
      return `Dentro desde ${dayAndTime(candidate.openStay.enteredAt)}`;
    }

    return candidate.registration && candidate.registration.status !== 'approved'
      ? `No autorizado · ${REGISTRATION_STATUS_LABELS[candidate.registration.status]}`
      : 'Afuera';
  }

  // ---- Vehículos dentro ---------------------------------------------------------------------

  protected readonly insideType = signal<'all' | VehicleType>('all');
  protected readonly insideKind = signal<'all' | 'institutional' | 'visitor'>('all');
  protected readonly insideQuery = signal('');

  protected readonly insideFiltered = computed(() => {
    const type = this.insideType();
    const kind = this.insideKind();
    const text = this.insideQuery().trim();

    return this.inside().filter(
      (stay) =>
        (type === 'all' || stay.vehicle.type === type) &&
        (kind === 'all' || stay.subject.kind === kind) &&
        this.matchesStay(stay, text),
    );
  });

  /** Filtro de texto de «Vehículos dentro»: placa, documento o nombre. */
  protected setInsideQuery(event: Event): void {
    this.insideQuery.set((event.target as HTMLInputElement).value);
  }

  /** Filtro por tipo de vehículo de «Vehículos dentro». */
  protected setInsideType(event: Event): void {
    this.insideType.set((event.target as HTMLSelectElement).value as 'all' | VehicleType);
  }

  /** Filtro por persona de «Vehículos dentro»: comunidad o visitantes. */
  protected setInsideKind(event: Event): void {
    this.insideKind.set((event.target as HTMLSelectElement).value as 'all' | 'institutional' | 'visitor');
  }

  /** true si el vehículo lleva dentro más horas de las configuradas (`PARKING.longStayHours`). */
  protected isLong(stay: ParkingStay): boolean {
    return isLongStay(stay, PARKING.longStayHours);
  }

  // ---- Movimientos --------------------------------------------------------------------------

  protected readonly movementScope = signal<'turno' | 'hoy'>('turno');

  /** Movimientos del turno activo o de hoy, incluidos los anulados para dejar constancia. */
  protected readonly scopedMovements = computed(() => {
    const movements = this.staysStore.movements();

    if (this.movementScope() === 'turno') {
      const shift = this.myShift();
      return shift ? movements.filter((movement) => movement.audit.shiftId === shift.id) : [];
    }

    const from = startOfDay().getTime();
    return movements.filter((movement) => movement.at.getTime() >= from);
  });

  /** Movimiento cuya anulación se está escribiendo. */
  protected readonly annulTargetId = signal<string | null>(null);
  protected readonly annulReason = signal('');
  protected readonly annulError = signal<string | null>(null);

  /** true si el movimiento sigue vigente y es del turno activo de quien tiene la sesión. */
  protected canAnnul(movement: ParkingMovement): boolean {
    return this.access.canAnnul(movement);
  }

  /** Abre el formulario de anulación del movimiento y lleva el foco al motivo. */
  protected startAnnul(movement: ParkingMovement): void {
    this.annulTargetId.set(movement.id);
    this.annulReason.set('');
    this.annulError.set(null);
    afterNextRender(() => document.getElementById(`annul-reason-${movement.id}`)?.focus(), {
      injector: this.injector,
    });
  }

  /** Cierra el formulario de anulación sin anular. */
  protected cancelAnnul(): void {
    this.annulTargetId.set(null);
    this.annulError.set(null);
  }

  /** Toma el motivo de la anulación mientras se escribe. */
  protected setAnnulReason(event: Event): void {
    this.annulReason.set((event.target as HTMLTextAreaElement).value);
  }

  /** Anula el movimiento con el motivo escrito (ADR-018). */
  protected confirmAnnul(movement: ParkingMovement): void {
    try {
      this.access.annul(movement, this.annulReason());
      this.annulTargetId.set(null);
      this.flash.set(`Anulaste ${this.movementLabel(movement).toLowerCase()} de ${vehicleTitle(movement.stay.vehicle)}.`);
    } catch (error) {
      if (!(error instanceof AccessError)) {
        throw error;
      }

      this.annulError.set(error.message);
    }
  }

  /** Marcas de control visibles en la bitácora (4.8). */
  protected movementFlags(movement: ParkingMovement): string[] {
    const flags: string[] = [];

    if (movement.kind === 'exit' && movement.stay.flags?.missingEntry && !movement.id.includes('anulada')) {
      flags.push('Sin ingreso registrado');
    }

    if (movement.kind === 'exit' && movement.stay.flags?.exitNotRecorded && movement.stay.exit === movement.audit) {
      flags.push('Salida no registrada: se cerró al volver a entrar');
    }

    return flags;
  }

  // ---- Turno --------------------------------------------------------------------------

  protected readonly myShift = this.shifts.mine;
  protected readonly activeShift = this.shifts.active;
  protected readonly toReceive = this.shifts.toReceive;
  protected readonly awaitingReception = this.shifts.awaitingReception;
  protected readonly lastClosedDay = this.shifts.lastClosedDay;

  /** Lo que dejaría el turno propio si se entregara ahora. */
  protected readonly liveSummary = computed(() => {
    const shift = this.myShift();
    return shift ? this.shifts.summaryFor(shift) : null;
  });

  protected readonly shiftHistory = computed(() => this.shifts.history().slice(0, 5));

  protected readonly handoverNotes = signal('');
  /** true: nadie recibe y el turno cierra la jornada. */
  protected readonly closesDay = signal(false);

  /** null hasta que el guardia responde si su conteo coincide. */
  protected readonly countMatches = signal<boolean | null>(null);
  protected readonly receptionNotes = signal('');
  protected readonly receptionAttempted = signal(false);

  protected readonly countError = computed(() => this.receptionAttempted() && this.countMatches() === null);

  protected readonly notesError = computed(
    () => this.receptionAttempted() && this.countMatches() === false && !this.receptionNotes().trim(),
  );

  /** Empieza un turno sin relevo, p. ej. el primero del día. */
  protected takeShift(): void {
    this.run(() => {
      this.shifts.start();
      this.flash.set('Tomaste el turno. Los movimientos que registres quedarán a tu nombre.');
    });
  }

  /** Entrega el turno propio al relevo, o cierra la jornada si no hay relevo. */
  protected handOver(event: Event): void {
    event.preventDefault();

    this.run(() => {
      const closesDay = this.closesDay();
      this.shifts.handOver(this.handoverNotes(), closesDay);
      this.handoverNotes.set('');
      this.closesDay.set(false);
      this.flash.set(
        closesDay
          ? 'Cerraste la jornada. Quedó constancia de los vehículos que siguen dentro.'
          : 'Entregaste el turno. Queda pendiente de que tu relevo lo reciba.',
      );
    });
  }

  /** Recibe el turno entregado; si el conteo no coincide, exige explicar la diferencia. */
  protected receive(event: Event): void {
    event.preventDefault();
    this.receptionAttempted.set(true);

    const countMatches = this.countMatches();

    if (countMatches === null || this.notesError()) {
      return;
    }

    this.run(() => {
      this.shifts.receive({ countMatches, notes: this.receptionNotes() });
      this.countMatches.set(null);
      this.receptionNotes.set('');
      this.receptionAttempted.set(false);
      this.flash.set(
        countMatches
          ? 'Recibiste el turno. Ya puedes registrar movimientos.'
          : 'Recibiste el turno y la diferencia quedó reportada a la administración.',
      );
    });
  }

  /** Observaciones para quien recibe el turno. */
  protected setHandoverNotes(event: Event): void {
    this.handoverNotes.set((event.target as HTMLTextAreaElement).value);
  }

  /** Observaciones de quien recibe; obligatorias si el conteo no coincide. */
  protected setReceptionNotes(event: Event): void {
    this.receptionNotes.set((event.target as HTMLTextAreaElement).value);
  }

  // ---- Presentación -------------------------------------------------------------------

  /** Ej. "Motos", para títulos y filtros. */
  protected pluralLabel(type: VehicleType): string {
    return PLURAL_LABELS[type];
  }

  /** "Ingreso" o "Salida". */
  protected movementLabel(movement: ParkingMovement): string {
    return MOVEMENT_LABELS[movement.kind];
  }

  /** Cómo se identificó el vehículo, p. ej. "Código QR" o "Documento". */
  protected methodLabel(movement: ParkingMovement): string {
    return IDENTIFICATION_LABELS[movement.audit.method];
  }

  /** Estado del turno en texto, p. ej. "En curso" o "Por recibir". */
  protected shiftLabel(shift: SecurityShift): string {
    return SHIFT_STATUS_LABELS[shiftStatus(shift)];
  }

  /** Clase de chip según el estado del turno: en curso se destaca, por recibir avisa. */
  protected shiftChipClass(shift: SecurityShift): string {
    const status = shiftStatus(shift);
    return status === 'active' ? 'chip--success' : status === 'awaiting-reception' ? 'chip--warning' : 'chip--neutral';
  }

  /** Turno que se recibió al empezar este, para mostrar de quién viene. */
  protected receivedFrom(shift: SecurityShift): SecurityShift | null {
    return this.shifts.history().find((candidate) => candidate.id === shift.receivedFromShiftId) ?? null;
  }

  /** Ej. "2 h 15 min". */
  protected durationSince(date: Date): string {
    return formatDuration(Date.now() - date.getTime());
  }

  // ---- Internos -----------------------------------------------------------------------

  /** Filtro de «Vehículos dentro»: placa, documento o nombre. */
  private matchesStay(stay: ParkingStay, text: string): boolean {
    if (text.length < 2) {
      return true;
    }

    const plate = normalizePlateQuery(text);
    const digits = text.replace(/\D/g, '');
    const tokens = nameTokens(text);
    const nameParts = nameTokens(stay.subject.fullName);

    return (
      (!!stay.vehicle.plate && plate.length >= 2 && stay.vehicle.plate.includes(plate)) ||
      (digits.length >= 4 && !!stay.subject.documentNumber?.includes(digits)) ||
      (tokens.length > 0 && tokens.every((token) => nameParts.some((part) => part.startsWith(token))))
    );
  }

  private zoneAlert(zone: ParkingZone): SecurityAlert {
    const free = freeSpots(zone);

    return zoneStatus(zone) === 'full'
      ? {
          id: `zone-${zone.id}`,
          tone: 'critical',
          title: `${zone.name}: ${ZONE_STATUS_LABELS.full.toLowerCase()}`,
          detail: `Los ${zone.capacity} puestos están en uso.`,
        }
      : {
          id: `zone-${zone.id}`,
          tone: 'warning',
          title: `${zone.name}: ${ZONE_STATUS_LABELS.filling.toLowerCase()}`,
          detail: `${free === 1 ? 'Queda 1 puesto libre' : `Quedan ${free} puestos libres`} de ${zone.capacity}.`,
        };
  }

  private startUndoTicker(): void {
    this.stopUndoTicker();
    this.now.set(Date.now());
    this.ticker = setInterval(() => {
      this.now.set(Date.now());

      if (this.undoSecondsLeft() === 0) {
        this.stopUndoTicker();
      }
    }, 500);
  }

  private stopUndoTicker(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  /**
   * Quita parámetros de la dirección sin sumar una entrada al historial, para que
   * recargar no reabra una tarjeta vieja y repetir la misma búsqueda desde el
   * header vuelva a funcionar (la misma dirección no dispara una navegación).
   */
  private clearParams(...names: ('buscar' | 'estancia')[]): void {
    const present = names.filter((name) => this[name]() !== undefined);

    if (present.length) {
      void this.router.navigate([], {
        queryParams: Object.fromEntries(present.map((name) => [name, null])),
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /** Lleva el foco al título de la tarjeta de resultado para que el lector lo anuncie. */
  private focusResult(): void {
    afterNextRender(() => document.getElementById('access-result-title')?.focus(), { injector: this.injector });
  }

  /** Ejecuta una acción de turno y muestra sus errores de negocio en pantalla. */
  private run(action: () => void): void {
    this.actionError.set(null);
    this.flash.set(null);

    try {
      action();
    } catch (error) {
      if (error instanceof ShiftError) {
        this.actionError.set(error.message);
        return;
      }

      throw error;
    }
  }
}
