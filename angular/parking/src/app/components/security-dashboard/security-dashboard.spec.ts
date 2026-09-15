import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { DemoProfile } from '../../core/services/auth.service';
import { IncidentService } from '../../core/services/incident.service';
import { ShiftService } from '../../core/services/shift.service';
import { StayService } from '../../core/services/stay.service';
import { VisitorPassService } from '../../core/services/visitor-pass.service';
import { signInForTest } from '../../testing/demo-session';
import { LectorCodigoQr } from '../lector-codigo-qr/lector-codigo-qr';
import { SecurityDashboard } from './security-dashboard';
import { securityNavigation } from './security-navigation';

describe('SecurityDashboard', () => {
  let fixture: ComponentFixture<SecurityDashboard>;

  const create = async (profile: DemoProfile, section = 'resumen') => {
    await TestBed.configureTestingModule({
      imports: [SecurityDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest(profile);
    fixture = TestBed.createComponent(SecurityDashboard);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };

  const open = async (section: string) => {
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const all = (selector: string) =>
    [...host().querySelectorAll(selector)].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());

  const click = async (label: string) => {
    const button = [...host().querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    button?.click();
    await fixture.whenStable();
  };

  const choose = async (label: string) => {
    const option = [...host().querySelectorAll<HTMLLabelElement>('.choice__option')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    option?.querySelector('input')?.click();
    await fixture.whenStable();
  };

  /** Elige una opción de los selectores segmentados (modo de identificación, alcance de movimientos). */
  const pickRange = async (label: string) => {
    const option = [...host().querySelectorAll<HTMLLabelElement>('.range__option')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    option?.querySelector('input')?.click();
    await fixture.whenStable();
  };

  const typeInto = async (selector: string, value: string) => {
    const field = host().querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const selectOption = async (selector: string, value: string) => {
    const select = host().querySelector<HTMLSelectElement>(selector)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  /** Datos de la tarjeta de resultado como { etiqueta: valor }. */
  const facts = () =>
    Object.fromEntries(
      [...host().querySelectorAll('.result .facts > div')].map((row) => [
        row.querySelector('dt')?.textContent?.trim(),
        row.querySelector('dd')?.textContent?.trim(),
      ]),
    );

  const confirmWarnings = async () => {
    host().querySelector<HTMLInputElement>('.confirm input')!.click();
    await fixture.whenStable();
  };

  const reader = () => fixture.debugElement.query(By.directive(LectorCodigoQr)).componentInstance as LectorCodigoQr;

  // Hora fija: las alertas por estancia larga dependen de la hora del día.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T10:00:00'));
  });

  afterEach(() => vi.useRealTimers());

  describe('resumen', () => {
    beforeEach(() => create('security'));

    it('muestra cuántos vehículos hay dentro, cuántos puestos quedan y los movimientos del día', () => {
      expect(all('.tile__value')).toEqual(['12', '98', '15']);
      expect(all('.tile__note')).toEqual([
        '10 de la comunidad · 2 visitantes',
        'de 110 · 12 en uso',
        '13 ingresos · 2 salidas',
      ]);
    });

    it('muestra la ocupación de cada tipo con puestos libres y en uso', () => {
      expect(all('.zone__count')).toEqual([
        '53 libres de 60 · 7 en uso',
        '27 libres de 30 · 3 en uso',
        '18 libres de 20 · 2 en uso',
      ]);
    });

    it('alerta de la moto que entró ayer y sigue dentro', () => {
      expect(all('.alert-item__title')).toEqual(['PQR71C lleva 15 h 20 min dentro']);
      expect(text('.alert-item__detail')).toContain('Juliana Castro Vélez');
    });

    it('lista los últimos movimientos con quién los registró', () => {
      const first = host().querySelector('.movement');

      expect(first?.textContent).toContain('Bicicleta');
      expect(first?.textContent).toContain('Visitante');
      expect(first?.textContent).toContain('Código QR · Carlos Ramírez');
    });

    it('recuerda al guardia que su turno está activo y lo lleva a registrar', () => {
      const link = host().querySelector('.shift-banner a');

      expect(text('.shift-banner')).toContain('Tu turno está activo desde las 5:00');
      expect(link?.textContent?.trim()).toBe('Registrar ingreso o salida');
      expect(link?.getAttribute('href')).toBe('/seguridad/control');
    });
  });

  describe('control de acceso', () => {
    beforeEach(() => create('security', 'control'));

    it('busca por documento y muestra quién está dentro y quién no está autorizado', async () => {
      await typeInto('#access-search', '1012345678');

      expect(all('.candidate__status')).toEqual([
        expect.stringContaining('Dentro desde hoy'),
        'No autorizado · Pendiente',
        'No autorizado · Rechazado',
      ]);
    });

    it('registra el ingreso de una bicicleta buscada por documento y permite deshacerlo', async () => {
      const stays = TestBed.inject(StayService);
      await typeInto('#access-search', '39876543');
      await click('Ver');

      expect(text('.result__direction')).toBe('Ingreso');
      expect(facts()).toMatchObject({
        'Nombre completo': 'Andrea Pineda Soto',
        Documento: '39876543',
        Tipo: 'Bicicleta',
        Marca: 'Specialized',
        Color: 'Rojo',
      });

      await click('Registrar ingreso');

      expect(text('.record')).toContain('Ingreso registrado');
      expect(text('.record')).toContain('Deshacer (10 s)');
      expect(stays.inside()).toHaveLength(13);
      expect(stays.movements()[0].audit).toMatchObject({
        guardName: 'Carlos Ramírez',
        shiftId: 'shift-carlos-hoy',
        method: 'document',
      });

      await click('Deshacer');

      expect(text('.flash')).toContain('Se deshizo: ingreso registrado de Bicicleta');
      expect(stays.inside()).toHaveLength(12);
      expect(host().querySelector('.record')).toBeNull();
    });

    it('un vehículo con registro pendiente no entra, y se explica la vía del visitante', async () => {
      await typeInto('#access-search', 'QWE28F');
      await click('Ver');

      expect(text('.result .notice--critical')).toContain('pendiente de aprobación');
      expect(text('.result .notice--critical')).toContain('formulario de visitantes');
      expect(host().querySelector('.result__primary')).toBeNull();
      expect(all('.result__actions button')).toEqual(['Cerrar']);
    });

    it('el pase QR del visitante muestra lo que escribió y exige confirmar su identidad', async () => {
      const passes = TestBed.inject(VisitorPassService);
      const pass = passes.issue({
        firstName: 'Ana María',
        lastName: 'Rodríguez Prueba',
        documentType: 'CC',
        documentNumber: '1000000001',
        vehicle: { type: 'scooter', color: 'Gris' },
        reason: 'Entrega de documentos',
      });

      await pickRange('Pase de visitante (QR)');
      reader().read.emit(pass.token);
      await fixture.whenStable();

      expect(text('.result__title')).toContain('Visitante');
      expect(facts()).toMatchObject({
        'Nombre completo': 'Ana María Rodríguez Prueba',
        Documento: '1000000001',
        Visita: 'Visitante · Entrega de documentos',
        Tipo: 'Scooter',
        Color: 'Gris',
      });
      expect(text('.result .notice--warning')).toContain('Compara el nombre y el número de documento');
      expect(host().querySelector<HTMLButtonElement>('.result__primary')?.disabled).toBe(true);

      await confirmWarnings();
      await click('Registrar ingreso');

      expect(text('.record')).toContain('Ingreso registrado');
      expect(passes.find(pass.token)?.status).toBe('used');
    });

    it('un código que no es de ningún pase muestra el error y no abre la tarjeta', async () => {
      await pickRange('Pase de visitante (QR)');
      reader().read.emit('codigo-cualquiera');
      await fixture.whenStable();

      expect(text('.card .notice--critical')).toContain('no corresponde a ningún pase');
      expect(host().querySelector('app-access-result')).toBeNull();
    });

    it('un ingreso de otro día se cierra para registrar uno nuevo, tras confirmar el aviso', async () => {
      await typeInto('#access-search', 'PQR71C');
      await click('Ver');

      expect(text('.result__direction')).toBe('Salida');
      expect(text('.result .notice--warning')).toContain('Su ingreso de ayer a las 6:40');
      expect(text('.result .notice--warning')).not.toContain('..');

      await confirmWarnings();
      await click('Cerrar el ingreso anterior y registrar uno nuevo');

      expect(text('.record')).toContain('Ingreso registrado y el anterior cerrado');
      expect(TestBed.inject(StayService).find('s-juliana')?.flags).toEqual({ exitNotRecorded: true });
    });

    it('la salida sin ingreso exige una nota', async () => {
      await typeInto('#access-search', 'STV64K');
      await click('Ver');
      await click('Registrar salida sin ingreso');

      expect(text('#access-note-error')).toBe('Explica por qué sale sin un ingreso registrado.');
      expect(host().querySelector('.record')).toBeNull();

      await typeInto('#access-note', 'Salió por la puerta vehicular sin pasar por portería.');
      await click('Registrar salida sin ingreso');

      expect(text('.record')).toContain('Salida registrada sin ingreso');
    });

    it('desde «Vehículos dentro» llega con la tarjeta de salida abierta', async () => {
      fixture.componentRef.setInput('estancia', 's-visita-martin');
      await fixture.whenStable();

      expect(text('.result__direction')).toBe('Salida');
      expect(facts()).toMatchObject({ Placa: 'UYT43G', Visita: 'Visitante · Reunión en Admisiones' });
    });

    it('lo que el guardia escribe se conserva aunque cambie la ocupación mientras decide', async () => {
      await typeInto('#access-search', 'KZT45F');
      await click('Ver');
      await typeInto('#access-note', 'Sale con acompañante');

      // Otro movimiento en portería mientras la tarjeta sigue abierta.
      TestBed.inject(StayService).registerExit('s-esteban', {
        guardUid: 'demo-guard-carlos',
        guardName: 'Carlos Ramírez',
        shiftId: 'shift-carlos-hoy',
        method: 'manual',
      });
      await fixture.whenStable();

      expect(host().querySelector<HTMLTextAreaElement>('#access-note')?.value).toBe('Sale con acompañante');
      expect(text('.result__title')).toContain('KZT45F');
    });
  });

  it('sin turno, el control de acceso avisa y no deja registrar', async () => {
    await create('security-relief', 'control');

    expect(text('.notice--warning')).toContain('No tienes un turno activo');

    await typeInto('#access-search', '39876543');
    await click('Ver');

    expect(text('.result .notice--critical')).toContain('No tienes un turno activo');
    expect(host().querySelector('.result__primary')).toBeNull();
    expect(host().querySelector('#access-note')).toBeNull();
  });

  describe('vehículos dentro', () => {
    beforeEach(() => create('security', 'dentro'));

    it('lista lo que está dentro y lo filtra por tipo, persona y texto', async () => {
      expect(host().querySelectorAll('.stay')).toHaveLength(12);

      await selectOption('#inside-type', 'bicicleta');
      expect(text('.card__count')).toBe('3 de 12');

      await selectOption('#inside-kind', 'visitor');
      expect(host().querySelectorAll('.stay')).toHaveLength(1);
      expect(text('.stay')).toContain('Luisa Guerrero Paz');

      await selectOption('#inside-type', 'all');
      await selectOption('#inside-kind', 'all');
      await typeInto('#inside-search', 'pqr');
      expect(host().querySelectorAll('.stay')).toHaveLength(1);
      expect(text('.stay')).toContain('Estancia larga');
    });

    it('cada vehículo lleva al control de acceso para registrar su salida', () => {
      const link = host().querySelector('a[aria-label^="Registrar salida de PQR71C"]');

      expect(link?.getAttribute('href')).toBe('/seguridad/control?estancia=s-juliana');
    });
  });

  describe('movimientos', () => {
    it('muestra los del turno y anula una salida con motivo, que queda marcada', async () => {
      await create('security', 'movimientos');

      expect(text('#log-title')).toBe('Movimientos de tu turno 15');

      const diegoExit = () =>
        [...host().querySelectorAll<HTMLElement>('.movement')].find(
          (item) => item.textContent?.includes('STV64K') && item.textContent.includes('Salida'),
        )!;

      diegoExit().querySelector<HTMLButtonElement>('.movement__annul')!.click();
      await fixture.whenStable();

      diegoExit().querySelector<HTMLButtonElement>('.small-btn--danger')!.click();
      await fixture.whenStable();
      expect(diegoExit().querySelector('.field__error')?.textContent).toContain('Escribe el motivo');

      const reason = diegoExit().querySelector<HTMLTextAreaElement>('textarea')!;
      reason.value = 'La salida era de otra moto';
      reason.dispatchEvent(new Event('input'));
      diegoExit().querySelector<HTMLButtonElement>('.small-btn--danger')!.click();
      await fixture.whenStable();

      expect(text('.flash')).toContain('Anulaste salida de STV64K');
      expect(diegoExit().textContent).toContain('Anulado por Carlos Ramírez');
      expect(diegoExit().querySelector('.movement__annul')).toBeNull();
      expect(TestBed.inject(StayService).find('s-diego')?.exitedAt).toBeNull();
    });

    it('sin turno propio se consulta el día, pero no se anula nada', async () => {
      await create('security-relief', 'movimientos');

      expect(text('.empty')).toContain('No tienes un turno activo');

      await pickRange('Todo el día');

      expect(text('#log-title')).toBe('Movimientos de hoy 15');
      expect(host().querySelector('.movement__annul')).toBeNull();
    });
  });

  it('otro guardia ve quién tiene el turno y no puede tomarlo', async () => {
    await create('security-relief');

    expect(text('.shift-banner')).toContain('Carlos Ramírez tiene el turno');
    expect(host().querySelector('.shift-banner a')).toBeNull();
  });

  describe('turno', () => {
    it('entregar el turno lo deja pendiente de recibir', async () => {
      await create('security', 'turno');

      expect(all('.summary__label')).toContain('Ingresos del turno');

      await click('Entregar turno');

      expect(text('.flash')).toContain('Queda pendiente de que tu relevo lo reciba');
      expect(text('#handed-title')).toBe('Turno entregado');
    });

    it('el relevo no puede recibir sin decir si el conteo coincide, ni reportar diferencias sin explicarlas', async () => {
      await create('security', 'turno');
      await click('Entregar turno');

      signInForTest('security-relief');
      await fixture.whenStable();

      expect(text('#receive-title')).toBe('Recibir el turno de Carlos Ramírez');

      await click('Recibo el turno');
      expect(text('#count-error')).toBe('Indica si tu conteo coincide.');

      await choose('No, hay diferencias');
      await click('Recibo el turno');
      expect(text('#reception-notes-error')).toBe('Explica qué diferencia encontraste.');
      expect(TestBed.inject(ShiftService).mine()).toBeNull();
    });

    it('recibir con diferencias empieza el turno del relevo y reporta la incidencia', async () => {
      await create('security', 'turno');
      await click('Entregar turno');

      signInForTest('security-relief');
      await fixture.whenStable();

      await choose('No, hay diferencias');
      const notes = host().querySelector<HTMLTextAreaElement>('#reception-notes')!;
      notes.value = 'Falta una bicicleta.';
      notes.dispatchEvent(new Event('input'));
      await click('Recibo el turno');

      expect(text('.flash')).toContain('la diferencia quedó reportada');
      expect(text('#my-shift-title')).toBe('Tu turno');
      expect(TestBed.inject(IncidentService).items()[0].description).toContain('Falta una bicicleta.');
    });

    it('cerrar la jornada permite que el siguiente guardia tome el turno sin recibirlo', async () => {
      await create('security', 'turno');
      await choose('Nadie: cierro la jornada');
      await click('Cerrar la jornada');

      signInForTest('security-relief');
      await open('turno');

      expect(text('#start-title')).toBe('No hay un turno activo');
      expect(text('.card__lead')).toContain('Carlos Ramírez cerró la jornada');

      await click('Tomar turno');
      expect(text('#my-shift-title')).toBe('Tu turno');
    });
  });

  it('el menú avisa cuando hay un turno por recibir', async () => {
    await create('security', 'turno');
    await click('Entregar turno');
    signInForTest('security-relief');

    const navigation = TestBed.runInInjectionContext(() => securityNavigation());
    const shiftItem = navigation.items().find((item) => item.id === 'turno');

    expect(navigation.context).toBe('Seguridad');
    expect(shiftItem?.badge).toBe(1);
  });
});
