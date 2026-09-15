import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AccessCandidate, AccessDecision, RegisterOptions } from '../../core/models/access';
import { AccessResult } from './access-result';

describe('AccessResult', () => {
  let fixture: ComponentFixture<AccessResult>;
  let emitted: RegisterOptions[];
  let cancelled: number;

  const candidate = (overrides: Partial<AccessCandidate> = {}): AccessCandidate => ({
    key: 'reg:reg-prueba',
    vehicle: { type: 'moto', plate: 'KZT45F', brand: 'Yamaha', line: 'FZ 2.0', color: 'Negro' },
    subject: {
      kind: 'institutional',
      uid: 'demo-uid',
      registrationId: 'reg-prueba',
      fullName: 'Julian Andrés Bejarano Rojas',
      documentNumber: '1012345678',
    },
    registration: null,
    pass: null,
    openStay: null,
    context: 'Estudiante · Administración de Empresas',
    source: 'plate',
    ...overrides,
  });

  const decision = (overrides: Partial<AccessDecision> = {}): AccessDecision => ({
    candidate: candidate(),
    direction: 'entry',
    blockers: [],
    warnings: [],
    canCloseStaleEntry: false,
    canExitWithoutEntry: true,
    ...overrides,
  });

  const show = async (value: AccessDecision) => {
    fixture.componentRef.setInput('decision', value);
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  /** Filas de datos como [etiqueta, valor, ¿monoespaciado?]. */
  const rows = () =>
    [...host().querySelectorAll('.facts > div')].map((row) => [
      row.querySelector('dt')?.textContent?.trim(),
      row.querySelector('dd')?.textContent?.trim(),
      row.querySelector('dd')?.classList.contains('plate'),
    ]);

  const button = (label: string) =>
    [...host().querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(label));

  const clickButton = async (label: string) => {
    button(label)!.click();
    await fixture.whenStable();
  };

  const typeNote = async (value: string) => {
    const note = host().querySelector<HTMLTextAreaElement>('#access-note')!;
    note.value = value;
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const confirmWarnings = async () => {
    host().querySelector<HTMLInputElement>('.confirm input')!.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccessResult] }).compileComponents();

    fixture = TestBed.createComponent(AccessResult);
    emitted = [];
    cancelled = 0;
    fixture.componentInstance.registered.subscribe((options) => emitted.push(options));
    fixture.componentInstance.cancelled.subscribe(() => (cancelled += 1));
    await show(decision());
  });

  it('muestra la persona y la moto, con la placa en letra monoespaciada', () => {
    expect(text('.result__direction')).toBe('Ingreso');
    expect(rows()).toEqual([
      ['Nombre completo', 'Julian Andrés Bejarano Rojas', false],
      ['Documento', '1012345678', false],
      ['Vínculo', 'Estudiante · Administración de Empresas', false],
      ['Tipo', 'Moto', false],
      ['Placa', 'KZT45F', true],
      ['Marca y línea', 'Yamaha FZ 2.0', false],
      ['Color', 'Negro', false],
    ]);
  });

  it('de la bicicleta muestra el serial y del scooter solo lo que se declaró', async () => {
    await show(
      decision({ candidate: candidate({ vehicle: { type: 'bicicleta', brand: 'GW', color: 'Verde', frameSerial: 'GWL458812' } }) }),
    );
    expect(rows().slice(3)).toEqual([
      ['Tipo', 'Bicicleta', false],
      ['Serial del marco', 'GWL458812', true],
      ['Marca', 'GW', false],
      ['Color', 'Verde', false],
    ]);

    await show(decision({ candidate: candidate({ key: 'reg:scooter', vehicle: { type: 'scooter', color: 'Gris' } }) }));
    expect(rows().slice(3)).toEqual([
      ['Tipo', 'Scooter', false],
      ['Color', 'Gris', false],
    ]);
  });

  it('de un visitante muestra el motivo de la visita', async () => {
    await show(
      decision({
        candidate: candidate({
          key: 'pass:token',
          subject: {
            kind: 'visitor',
            passToken: 'token',
            fullName: 'Ana María Rodríguez Prueba',
            documentNumber: '1000000001',
            reason: 'Entrega de documentos',
          },
          context: 'Visitante · Entrega de documentos',
        }),
      }),
    );

    expect(text('.result__title')).toContain('Visitante');
    expect(rows()[2]).toEqual(['Visita', 'Visitante · Entrega de documentos', false]);
  });

  it('lo que impide registrar se muestra y solo deja cerrar la tarjeta', async () => {
    await show(decision({ blockers: [{ code: 'not-approved', message: 'No autorizado: registro pendiente.' }] }));

    expect(text('.notice--critical')).toBe('No autorizado: registro pendiente.');
    expect(host().querySelector('.result__primary')).toBeNull();

    await clickButton('Cerrar');
    expect(cancelled).toBe(1);
  });

  it('sin turno no ofrece nota ni otras acciones', async () => {
    await show(decision({ blockers: [{ code: 'no-shift', message: 'No tienes un turno activo.' }] }));

    expect(host().querySelector('#access-note')).toBeNull();
    expect(host().querySelector('.result__more')).toBeNull();
  });

  it('los avisos exigen confirmar antes de registrar, y emite lo que el guardia confirmó', async () => {
    await show(decision({ warnings: [{ code: 'zone-full', message: 'Zona de motos no tiene puestos libres.' }] }));

    expect(button('Registrar ingreso')?.disabled).toBe(true);

    await confirmWarnings();
    await typeNote('Hay un puesto libre al fondo');
    await clickButton('Registrar ingreso');

    expect(emitted).toEqual([{ action: 'default', warningsConfirmed: true, note: 'Hay un puesto libre al fondo' }]);
  });

  it('la salida sin ingreso no se emite sin una nota', async () => {
    await clickButton('Registrar salida sin ingreso');

    expect(emitted).toEqual([]);
    expect(text('#access-note-error')).toBe('Explica por qué sale sin un ingreso registrado.');

    await typeNote('Entró antes de abrir la portería');
    await clickButton('Registrar salida sin ingreso');

    expect(emitted).toEqual([{ action: 'exit-without-entry', warningsConfirmed: false, note: 'Entró antes de abrir la portería' }]);
  });

  it('conserva lo escrito si la decisión se actualiza para el mismo vehículo, y lo reinicia al cambiar de vehículo', async () => {
    const warned = (codes: ('zone-full' | 'recent-movement')[]) =>
      decision({ warnings: codes.map((code) => ({ code, message: `Aviso ${code}` })) });
    const note = () => host().querySelector<HTMLTextAreaElement>('#access-note')!.value;
    const checked = () => host().querySelector<HTMLInputElement>('.confirm input')!.checked;

    await show(warned(['zone-full']));
    await confirmWarnings();
    await typeNote('Sale con acompañante');

    // Llega otra evaluación del mismo vehículo, idéntica: nada se pierde.
    await show(warned(['zone-full']));
    expect(note()).toBe('Sale con acompañante');
    expect(checked()).toBe(true);

    // Aparece un aviso nuevo: hay que volver a confirmarlo, pero la nota sigue.
    await show(warned(['zone-full', 'recent-movement']));
    expect(checked()).toBe(false);
    expect(note()).toBe('Sale con acompañante');

    // Otro vehículo: tarjeta en blanco.
    await show(decision({ candidate: candidate({ key: 'reg:otro' }), warnings: [{ code: 'zone-full', message: 'Aviso' }] }));
    expect(note()).toBe('');
    expect(checked()).toBe(false);
  });
});
