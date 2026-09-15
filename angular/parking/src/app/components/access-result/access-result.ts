import { Component, computed, input, linkedSignal, output } from '@angular/core';
import type { AccessAction, AccessDecision, RegisterOptions } from '../../core/models/access';
import { formatDuration } from '../../core/models/parking';
import { vehicleLabel, vehicleTitle } from '../../core/models/vehicle';
import { REGISTRATION_STATUS_LABELS } from '../../core/models/vehicle-registration';
import { dayAndTime } from '../../core/utils/dates';

/** Un dato de la tarjeta: etiqueta y valor. */
interface Fact {
  label: string;
  value: string;
  /** Placas y seriales van en letra monoespaciada para leer cada carácter sin dudas. */
  mono?: boolean;
}

/**
 * Tarjeta de resultado del control de acceso (ADR-011).
 *
 * Muestra solo lo necesario para verificar (4.7): la persona y los datos del
 * vehículo según su tipo. Presenta lo que impide registrar y los avisos que
 * exigen confirmación, y ofrece las acciones especiales de 4.6. No registra
 * nada por sí misma: emite lo que confirmó el guardia.
 */
@Component({
  selector: 'app-access-result',
  styleUrl: './access-result.css',
  templateUrl: './access-result.html',
})
export class AccessResult {
  /** Decisión evaluada por `AccessControlService`. */
  readonly decision = input.required<AccessDecision>();
  /** Error del último intento de registro, para mostrarlo junto a las acciones. */
  readonly error = input<string | null>(null);

  /** El guardia confirmó una acción; la pantalla la registra. */
  readonly registered = output<RegisterOptions>();
  /** El guardia cerró la tarjeta sin registrar. */
  readonly cancelled = output<void>();

  /*
   * La decisión llega como un objeto nuevo cada vez que cambia algo en el
   * parqueadero. linkedSignal se reinicia con cualquier cambio de lo que lee su
   * `source`, así que se enlaza a estos computed, que solo cambian cuando cambia
   * el texto de la clave: una estancia registrada por otro guardia no borra lo
   * que este lleva escrito.
   */
  private readonly candidateKey = computed(() => this.decision().candidate.key);
  /** Vehículo más avisos: si aparece un aviso nuevo, hay que volver a confirmarlo. */
  private readonly warningsKey = computed(
    () => `${this.candidateKey()}|${this.decision().warnings.map((warning) => warning.code).join(',')}`,
  );

  /** Nota del guardia. Se reinicia al cambiar de vehículo. */
  protected readonly note = linkedSignal({ source: this.candidateKey, computation: () => '' });
  /** Confirmación de los avisos. Se reinicia al cambiar de vehículo o de avisos. */
  protected readonly warningsConfirmed = linkedSignal({ source: this.warningsKey, computation: () => false });
  /** Acción especial que exige nota y el guardia intentó sin escribirla. */
  protected readonly noteMissing = linkedSignal({ source: this.candidateKey, computation: () => false });

  protected readonly candidate = computed(() => this.decision().candidate);
  protected readonly isExit = computed(() => this.decision().direction === 'exit');
  protected readonly noShift = computed(() => this.decision().blockers.some((blocker) => blocker.code === 'no-shift'));
  protected readonly blocked = computed(() => this.decision().blockers.length > 0);
  protected readonly title = computed(() => vehicleTitle(this.candidate().vehicle));

  protected readonly personFacts = computed<Fact[]>(() => {
    const { subject, context } = this.candidate();
    // «Nombre completo» (nombres y apellidos) cabe en una línea incluso en 375 px.
    const facts: Fact[] = [{ label: 'Nombre completo', value: subject.fullName }];

    if (subject.documentNumber) {
      facts.push({ label: 'Documento', value: subject.documentNumber });
    }

    facts.push({ label: subject.kind === 'visitor' ? 'Visita' : 'Vínculo', value: context });
    return facts;
  });

  /** Datos del vehículo según su tipo (4.7). */
  protected readonly vehicleFacts = computed<Fact[]>(() => {
    const { vehicle } = this.candidate();
    const facts: Fact[] = [{ label: 'Tipo', value: vehicleLabel(vehicle.type) }];
    const model = [vehicle.brand, vehicle.line].filter(Boolean).join(' ');

    if (vehicle.plate) {
      facts.push({ label: 'Placa', value: vehicle.plate, mono: true });
    }

    if (vehicle.frameSerial) {
      facts.push({ label: 'Serial del marco', value: vehicle.frameSerial, mono: true });
    }

    if (model) {
      facts.push({ label: vehicle.line ? 'Marca y línea' : 'Marca', value: model });
    }

    if (vehicle.color) {
      facts.push({ label: 'Color', value: vehicle.color });
    }

    return facts;
  });

  /** "Dentro desde hoy a las 7:05 a. m. · 2 h 15 min" o "Afuera". */
  protected readonly whereabouts = computed(() => {
    const stay = this.candidate().openStay;
    return stay
      ? `Dentro desde ${dayAndTime(stay.enteredAt)} · ${formatDuration(Date.now() - stay.enteredAt.getTime())}`
      : 'Afuera';
  });

  /** Estado del registro del vehículo, si es de la comunidad. */
  protected readonly registrationStatus = computed(() => {
    const registration = this.candidate().registration;
    return registration ? REGISTRATION_STATUS_LABELS[registration.status] : null;
  });

  protected setNote(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
    this.noteMissing.set(false);
  }

  protected setWarningsConfirmed(event: Event): void {
    this.warningsConfirmed.set((event.target as HTMLInputElement).checked);
  }

  /**
   * Emite la acción elegida. La salida sin ingreso exige nota; el resto de
   * validaciones las repite el servicio al registrar.
   */
  protected confirm(action: AccessAction): void {
    if (action === 'exit-without-entry' && !this.note().trim()) {
      this.noteMissing.set(true);
      return;
    }

    this.registered.emit({ action, note: this.note(), warningsConfirmed: this.warningsConfirmed() });
  }
}
