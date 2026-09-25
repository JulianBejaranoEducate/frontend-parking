import { TestBed } from '@angular/core/testing';
import type { MovementAudit, StaySubject } from '../models/parking';
import { StayError, StayService } from './stay.service';

describe('StayService', () => {
  let service: StayService;

  const audit: MovementAudit = {
    guardUid: 'demo-guard-carlos',
    guardName: 'Carlos Ramírez',
    shiftId: 'shift-carlos-hoy',
    method: 'plate-photo',
  };

  const visitor: StaySubject = {
    kind: 'visitor',
    passToken: 'pase-prueba',
    fullName: 'Persona de Prueba',
    documentNumber: '1000000001',
    reason: 'Prueba',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StayService);
  });

  it('cuenta los vehículos dentro por tipo con los datos de ejemplo', () => {
    expect(service.inside()).toHaveLength(12);
    expect(service.insideByType()).toEqual({ moto: 7, bicicleta: 3, scooter: 2 });
  });

  it('la ocupación de cada cupo sale de contar, no de un número guardado', () => {
    expect(service.zones().map((zone) => `${zone.accepts}:${zone.occupied}/${zone.capacity}`)).toEqual([
      'moto:7/60',
      'bicicleta:3/30',
      'scooter:2/20',
    ]);
  });

  it('registrar un ingreso ocupa un puesto y aparece primero en los movimientos', () => {
    service.registerEntry({ vehicle: { type: 'scooter', color: 'Azul' }, subject: visitor, audit });

    expect(service.insideByType().scooter).toBe(3);
    expect(service.movements()[0]).toMatchObject({ kind: 'entry', audit });
  });

  it('no deja registrar dos ingresos abiertos del mismo vehículo', () => {
    expect(() =>
      service.registerEntry({
        vehicle: { type: 'moto', plate: 'KZT45F' },
        subject: { kind: 'institutional', uid: 'demo-uid', registrationId: 'reg-kzt45f', fullName: 'Julian' },
        audit,
      }),
    ).toThrow(StayError);
  });

  it('registrar la salida libera el puesto y guarda quién la autorizó', () => {
    const stay = service.inside().find((candidate) => candidate.vehicle.plate === 'KZT45F')!;

    const closed = service.registerExit(stay.id, { ...audit, method: 'manual' });

    expect(closed.exit?.method).toBe('manual');
    expect(service.insideByType().moto).toBe(6);
    expect(() => service.registerExit(stay.id, audit)).toThrow('ya tenía la salida registrada');
  });

  it('el historial de una persona solo trae sus estancias', () => {
    const history = service.staysOf('demo-uid');

    expect(history).toHaveLength(11);
    expect(history.every((stay) => stay.subject.kind === 'institutional' && stay.subject.uid === 'demo-uid')).toBe(true);
  });

  describe('casos especiales y anulaciones (Fase 2)', () => {
    const annulment = { at: new Date(), guardUid: 'demo-guard-carlos', guardName: 'Carlos Ramírez', reason: 'Error de registro' };

    it('una salida sin ingreso dura cero y queda marcada, sin tocar la ocupación', () => {
      const at = new Date();
      const stay = service.registerExitWithoutEntry({ vehicle: { type: 'scooter', color: 'Azul' }, subject: visitor, audit }, at);

      expect(stay).toMatchObject({ enteredAt: at, exitedAt: at, flags: { missingEntry: true } });
      expect(service.inside()).toHaveLength(12);
    });

    it('no registra una salida sin ingreso si el vehículo sí tiene uno abierto', () => {
      const kzt45f = service.find('s-01')!;

      expect(() =>
        service.registerExitWithoutEntry({ vehicle: kzt45f.vehicle, subject: kzt45f.subject, audit }),
      ).toThrow(StayError);
    });

    it('cerrar un ingreso viejo lo marca como salida no registrada', () => {
      const closed = service.closeWithoutExit('s-juliana', audit);

      expect(closed.flags).toEqual({ exitNotRecorded: true });
      expect(service.insideByType().moto).toBe(6);
    });

    it('un ingreso anulado deja de contar para la ocupación y el historial, pero sigue en la bitácora', () => {
      service.annulEntry('s-01', annulment);

      expect(service.insideByType().moto).toBe(6);
      expect(service.staysOf('demo-uid')).toHaveLength(10);
      expect(service.movements().find((movement) => movement.id === 's-01:entry')?.annulment).toEqual(annulment);
      expect(() => service.annulEntry('s-01', annulment)).toThrow('ya estaba anulado');
      expect(() => service.registerExit('s-01', audit)).toThrow('fue anulado');
    });

    it('anular una salida reabre la estancia y guarda la salida anulada', () => {
      const exitAt = new Date();
      service.registerExit('s-01', audit, exitAt);

      const reopened = service.annulExit('s-01', annulment);

      expect(reopened.exitedAt).toBeNull();
      expect(reopened.annulledExits).toEqual([{ exitedAt: exitAt, audit, annulment }]);
      expect(service.insideByType().moto).toBe(7);
    });

    it('no reabre una salida si el vehículo ya volvió a entrar', () => {
      const kzt45f = service.find('s-01')!;
      service.registerExit('s-01', audit);
      service.registerEntry({ vehicle: kzt45f.vehicle, subject: kzt45f.subject, audit });

      expect(() => service.annulExit('s-01', annulment)).toThrow('otro ingreso abierto');
    });

    it('anular una salida sin ingreso la anula completa', () => {
      const stay = service.registerExitWithoutEntry({ vehicle: { type: 'scooter', color: 'Azul' }, subject: visitor, audit });

      expect(service.annulExit(stay.id, annulment).entryAnnulment).toEqual(annulment);
      expect(service.inside()).toHaveLength(12);
    });

    it('restaurar devuelve la estancia a su copia previa o elimina la recién creada', () => {
      const before = service.find('s-01')!;
      service.registerExit('s-01', audit);
      const created = service.registerEntry({ vehicle: { type: 'scooter', color: 'Azul' }, subject: visitor, audit });

      service.restore(created.id, null);
      service.restore('s-01', before);

      expect(service.find(created.id)).toBeUndefined();
      expect(service.find('s-01')).toBe(before);
    });
  });
});
