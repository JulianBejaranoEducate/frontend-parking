import { TestBed } from '@angular/core/testing';
import type { AccessCandidate, RegisterOptions } from '../models/access';
import type { MovementAudit } from '../models/parking';
import type { VisitorRegistration } from '../models/visitor-pass';
import { signInForTest } from '../../testing/demo-session';
import { AccessControlService, type AccessErrorCode, AccessError } from './access-control.service';
import { StayService } from './stay.service';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { VisitorPassService } from './visitor-pass.service';

/**
 * Reglas de portería de las Fases 2 y 3 (sección 4 de planeacion-desarrollo.md)
 * sobre los datos de ejemplo: Carlos tiene el turno en curso, KZT45F está dentro,
 * PQR71C entró ayer y Andrea (bicicleta, documento 39876543) ya salió hoy.
 */
describe('AccessControlService', () => {
  const now = new Date('2026-09-15T10:00:00');
  const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);

  let service: AccessControlService;
  let stays: StayService;
  let passes: VisitorPassService;

  const visitor: VisitorRegistration = {
    firstName: 'Ana María',
    lastName: 'Rodríguez Prueba',
    documentType: 'CC',
    documentNumber: '1000000001',
    vehicle: { type: 'moto', plate: 'ABC12D', brand: 'Honda', color: 'Rojo' },
    reason: 'Entrega de documentos',
  };

  const confirmed: RegisterOptions = { action: 'default', warningsConfirmed: true, note: '' };
  const unconfirmed: RegisterOptions = { action: 'default', warningsConfirmed: false, note: '' };

  /** Primer resultado de una búsqueda; falla si no hay ninguno. */
  const find = (query: string): AccessCandidate => {
    const [candidate] = service.search(query);

    if (!candidate) {
      throw new Error(`La búsqueda «${query}» no trajo resultados`);
    }

    return candidate;
  };

  /** Evalúa y registra en un solo paso, como lo haría la tarjeta de resultado. */
  const register = (candidate: AccessCandidate, options: RegisterOptions = confirmed, at = now) =>
    service.register(service.evaluate(candidate, at), options, at);

  const expectError = (action: () => unknown, code: AccessErrorCode) => {
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).code).toBe(code);
      return;
    }

    throw new Error(`Se esperaba el error ${code}`);
  };

  const movement = (id: string) => {
    const found = stays.movements().find((item) => item.id === id);

    if (!found) {
      throw new Error(`No existe el movimiento ${id}`);
    }

    return found;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);

    TestBed.configureTestingModule({});
    signInForTest('security');
    service = TestBed.inject(AccessControlService);
    stays = TestBed.inject(StayService);
    passes = TestBed.inject(VisitorPassService);
  });

  afterEach(() => vi.useRealTimers());

  describe('buscar', () => {
    it('encuentra la placa sin importar mayúsculas, espacios ni guiones', () => {
      const candidate = find('kzt-45 f');

      expect(candidate.vehicle.plate).toBe('KZT45F');
      expect(candidate.source).toBe('plate');
      expect(candidate.openStay?.id).toBe('s-01');
    });

    it('por documento trae todos los vehículos de la persona, primero el que está dentro', () => {
      const results = service.search('1.012.345.678');

      expect(results.map((candidate) => candidate.key)).toEqual([
        'reg:reg-kzt45f',
        'reg:reg-bianchi',
        'reg:reg-scooter-julian',
      ]);
      expect(results.every((candidate) => candidate.source === 'document')).toBe(true);
    });

    it('por nombre acepta el comienzo de nombres y apellidos, sin tildes', () => {
      const candidate = find('sebas gomez');

      expect(candidate.key).toBe('reg:reg-trek');
      expect(candidate.source).toBe('name');
    });

    it('incluye a los visitantes que están dentro, para registrar su salida', () => {
      const candidate = find('UYT43G');

      expect(candidate.key).toBe('stay:s-visita-martin');
      expect(candidate.subject.kind).toBe('visitor');
      expect(candidate.context).toBe('Visitante · Reunión en Admisiones');
    });

    it('necesita al menos 3 caracteres', () => {
      expect(service.search('kz')).toEqual([]);
    });
  });

  describe('decidir', () => {
    it('la dirección sale sola: afuera es ingreso y dentro es salida', () => {
      expect(service.evaluate(find('39876543'), now)).toMatchObject({ direction: 'entry', blockers: [], warnings: [] });
      expect(service.evaluate(find('KZT45F'), now)).toMatchObject({ direction: 'exit', blockers: [], warnings: [] });
    });

    it('sin registro aprobado no entra, y el mensaje explica la vía del visitante', () => {
      const pending = service.evaluate(find('QWE28F'), now).blockers[0];
      const rejected = service.evaluate(find('RTY19D'), now).blockers[0];
      const needsUpdate = service.evaluate(find('52345678'), now).blockers[0];

      expect(pending.code).toBe('not-approved');
      expect(pending.message).toContain('pendiente de aprobación');
      expect(pending.message).toContain('formulario de visitantes');
      expect(rejected.message).toContain('rechazado (faltan documentos)');
      expect(needsUpdate.message).toContain('pidió actualizar un documento');
      expectError(() => register(find('QWE28F')), 'blocked');
    });

    it('sin turno activo no se registra nada', () => {
      signInForTest('security-relief');
      const candidate = find('39876543');

      expect(service.evaluate(candidate, now).blockers.map((blocker) => blocker.code)).toEqual(['no-shift']);
      expectError(() => register(candidate), 'no-shift');
    });

    it('con la zona llena avisa, y solo registra si el guardia lo confirma', () => {
      const audit: MovementAudit = { guardUid: 'g', guardName: 'Prueba', shiftId: null, method: 'manual' };

      for (let index = 0; index < 27; index++) {
        stays.registerEntry(
          {
            vehicle: { type: 'bicicleta', brand: 'Genérica', color: 'Negro' },
            subject: {
              kind: 'visitor',
              passToken: `lleno-${index}`,
              fullName: 'Visitante de prueba',
              documentNumber: '1000000002',
              reason: 'Prueba',
            },
            audit,
          },
          now,
        );
      }

      const candidate = find('39876543');

      expect(service.evaluate(candidate, now).warnings.map((warning) => warning.code)).toEqual(['zone-full']);
      expectError(() => register(candidate, unconfirmed), 'unconfirmed-warnings');
      expect(register(candidate, confirmed).kind).toBe('entry');
    });

    it('avisa si la misma persona ya tiene otro vehículo dentro', () => {
      signInForTest('admin');
      TestBed.inject(VehicleRegistrationService).approve('reg-bianchi');
      signInForTest('security');

      const bicycle = service.search('1012345678').find((candidate) => candidate.key === 'reg:reg-bianchi')!;

      expect(service.evaluate(bicycle, now).direction).toBe('entry');
      expect(service.evaluate(bicycle, now).warnings).toEqual([
        { code: 'other-vehicle-inside', message: 'Julian Andrés Bejarano Rojas ya tiene dentro una moto KZT45F.' },
      ]);
    });

    it('avisa de un movimiento repetido del mismo vehículo en menos de 2 minutos', () => {
      const candidate = find('KZT45F');
      register(candidate);

      expect(service.evaluate(candidate, later(60)).warnings.map((warning) => warning.code)).toEqual(['recent-movement']);
      expect(service.evaluate(candidate, later(180)).warnings).toEqual([]);
    });

    it('guarda quién registró, en qué turno y cómo identificó el vehículo', () => {
      const byDocument = register(find('39876543'));
      const byPlate = register(find('BCD82M'), confirmed, later(1));

      expect(byDocument.stay.entry).toEqual({
        guardUid: 'demo-guard-carlos',
        guardName: 'Carlos Ramírez',
        shiftId: 'shift-carlos-hoy',
        method: 'document',
      });
      expect(byPlate.kind).toBe('exit');
      expect(byPlate.stay.exit?.method).toBe('manual');
    });
  });

  describe('casos especiales', () => {
    it('un ingreso de otro día pide confirmar y se puede cerrar para registrar uno nuevo', () => {
      const candidate = find('PQR71C');
      const decision = service.evaluate(candidate, now);

      expect(decision.direction).toBe('exit');
      expect(decision.warnings.map((warning) => warning.code)).toEqual(['stale-entry']);
      expect(decision.canCloseStaleEntry).toBe(true);

      const record = register(candidate, { action: 'close-stale-and-enter', warningsConfirmed: true, note: '' });

      expect(record.kind).toBe('reentry');
      expect(stays.find('s-juliana')).toMatchObject({ exitedAt: now, flags: { exitNotRecorded: true } });
      expect(stays.openStayFor(candidate.vehicle, candidate.subject)?.id).toBe(record.stay.id);
      expect(stays.inside()).toHaveLength(12);
    });

    it('la salida sin ingreso exige una nota y queda marcada para revisión', () => {
      const candidate = find('39876543');
      const withoutNote: RegisterOptions = { action: 'exit-without-entry', warningsConfirmed: false, note: '  ' };

      expectError(() => register(candidate, withoutNote), 'missing-note');

      const record = register(candidate, { ...withoutNote, note: 'Entró antes de abrir la portería.' });

      expect(record.kind).toBe('exit-without-entry');
      expect(record.stay).toMatchObject({ enteredAt: now, exitedAt: now, flags: { missingEntry: true } });
      expect(record.stay.exit?.note).toBe('Entró antes de abrir la portería.');
      expect(stays.inside()).toHaveLength(12);
      // En la bitácora solo figura la salida: el ingreso no pasó por portería.
      expect(stays.movements().filter((item) => item.stay.id === record.stay.id).map((item) => item.kind)).toEqual(['exit']);
    });
  });

  describe('deshacer', () => {
    it('en los primeros 10 segundos no deja rastro', () => {
      const before = stays.movements().length;
      const record = register(find('39876543'));

      service.undo(record, later(9));

      expect(stays.find(record.stay.id)).toBeUndefined();
      expect(stays.movements()).toHaveLength(before);
    });

    it('deshacer una salida deja el vehículo dentro otra vez', () => {
      const record = register(find('KZT45F'));

      service.undo(record, later(5));

      expect(stays.find('s-01')?.exitedAt).toBeNull();
    });

    it('pasados los 10 segundos pide anular con motivo', () => {
      const record = register(find('39876543'));

      expectError(() => service.undo(record, later(11)), 'undo-expired');
      expect(stays.find(record.stay.id)).toBeDefined();
    });
  });

  describe('pases de visitante (Fase 3)', () => {
    it('un código que no es de ningún pase no identifica a nadie', () => {
      expect(service.candidateForPass('codigo-cualquiera')).toBeNull();
    });

    it('el pase vigente muestra los datos del formulario y exige comparar el documento', () => {
      const pass = passes.issue(visitor, now);
      const candidate = service.candidateForPass(pass.token)!;
      const decision = service.evaluate(candidate, now);

      expect(candidate.subject).toMatchObject({ kind: 'visitor', fullName: 'Ana María Rodríguez Prueba' });
      expect(decision.blockers).toEqual([]);
      expect(decision.warnings.map((warning) => warning.code)).toEqual(['check-identity']);
      expect(decision.canExitWithoutEntry).toBe(false);

      const record = register(candidate);

      expect(record.method).toBe('qr');
      expect(passes.find(pass.token)).toMatchObject({ status: 'used', stayId: record.stay.id, usedBy: 'Carlos Ramírez' });
    });

    it('un pase vencido, anulado o ya usado no deja ingresar', () => {
      const expired = passes.issue(visitor, new Date(now.getTime() - 20 * 60_000));
      const revoked = passes.issue(visitor, now);
      passes.revoke(revoked.token, 'Reemplazado por un pase nuevo');

      const blockerOf = (token: string, at = now) =>
        service.evaluate(service.candidateForPass(token)!, at).blockers.map((blocker) => blocker.code);

      expect(blockerOf(expired.token)).toEqual(['pass-expired']);
      expect(blockerOf(revoked.token)).toEqual(['pass-revoked']);

      const used = passes.issue({ ...visitor, vehicle: { type: 'scooter', color: 'Gris' } }, now);
      register(service.candidateForPass(used.token)!);
      register(service.candidateForPass(used.token)!, confirmed, later(200));

      expect(blockerOf(used.token, later(400))).toEqual(['pass-used']);
    });

    it('la tarjeta abierta se evalúa con el pase actual, no con la copia de cuando se escaneó', () => {
      const pass = passes.issue(visitor, now);
      const candidate = service.candidateForPass(pass.token)!;

      passes.markUsed(pass.token, { stayId: 'otra-estancia', guardName: 'Diana Morales' }, now);

      expect(service.evaluate(candidate, now).blockers.map((blocker) => blocker.code)).toEqual(['pass-used']);
      expectError(() => register(candidate), 'blocked');
    });

    it('deshacer el ingreso devuelve el pase a vigente', () => {
      const pass = passes.issue(visitor, now);
      const record = register(service.candidateForPass(pass.token)!);

      service.undo(record, later(3));

      expect(passes.find(pass.token)?.status).toBe('pending');
    });

    it('el visitante que salió no vuelve a entrar sin un pase nuevo', () => {
      const candidate = find('UYT43G');
      register(candidate);

      expect(service.evaluate(candidate, later(300)).blockers.map((blocker) => blocker.code)).toEqual(['pass-required']);
    });
  });

  it('un vehículo cuyo registro se eliminó puede salir, pero no volver a entrar', () => {
    signInForTest('user');
    TestBed.inject(VehicleRegistrationService).remove('reg-kzt45f');
    signInForTest('security');

    const candidate = find('KZT45F');

    expect(candidate.key).toBe('stay:s-01');
    register(candidate);

    const blocker = service.evaluate(candidate, later(300)).blockers[0];
    expect(blocker.code).toBe('not-approved');
    expect(blocker.message).toContain('ya no tiene un registro vigente');
  });

  describe('anular (ADR-018)', () => {
    it('anular un ingreso del turno exige motivo y lo saca de la ocupación', () => {
      const entry = movement('s-esteban:entry');

      expect(service.canAnnul(entry)).toBe(true);
      expectError(() => service.annul(entry, 'mal', now), 'missing-reason');

      service.annul(entry, 'Se registró la placa equivocada', now);

      expect(stays.inside().some((stay) => stay.id === 's-esteban')).toBe(false);
      expect(movement('s-esteban:entry').annulment).toMatchObject({
        guardName: 'Carlos Ramírez',
        reason: 'Se registró la placa equivocada',
      });
      expect(service.canAnnul(movement('s-esteban:entry'))).toBe(false);
    });

    it('anular una salida deja el vehículo dentro y conserva la salida anulada en la bitácora', () => {
      register(find('KZT45F'));

      service.annul(movement('s-01:exit'), 'Salió otra moto parecida', later(60));

      expect(stays.find('s-01')?.exitedAt).toBeNull();
      expect(movement('s-01:exit-anulada-0').annulment?.reason).toBe('Salió otra moto parecida');
    });

    it('solo se anulan movimientos del turno propio', () => {
      const yesterday = movement('s-juliana:entry');

      expect(service.canAnnul(yesterday)).toBe(false);
      expectError(() => service.annul(yesterday, 'No es de mi turno', now), 'not-allowed');

      signInForTest('security-relief');
      expectError(() => service.annul(movement('s-esteban:entry'), 'Sin turno activo', now), 'no-shift');
    });

    it('anular el ingreso de un visitante no reactiva su pase', () => {
      const pass = passes.issue(visitor, now);
      const record = register(service.candidateForPass(pass.token)!);

      service.annul(movement(`${record.stay.id}:entry`), 'El visitante no entró', later(30));

      expect(passes.find(pass.token)?.status).toBe('used');
    });
  });
});
