import { TestBed } from '@angular/core/testing';
import { shiftStatus } from '../models/shift';
import { signInForTest } from '../../testing/demo-session';
import { IncidentService } from './incident.service';
import { NotificationService } from './notification.service';
import { ShiftError, ShiftService } from './shift.service';

describe('ShiftService', () => {
  let service: ShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShiftService);
  });

  const expectError = (action: () => unknown, code: ShiftError['code']) => {
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(ShiftError);
      expect((error as ShiftError).code).toBe(code);
      return;
    }

    throw new Error(`Se esperaba el error ${code}`);
  };

  it('arranca con el turno de Carlos en curso', () => {
    signInForTest('security');

    expect(service.active()?.guardName).toBe('Carlos Ramírez');
    expect(service.mine()).toBe(service.active());
  });

  it('solo el personal de seguridad maneja turnos', () => {
    signInForTest('admin');

    expectError(() => service.start(), 'forbidden');
  });

  it('nadie toma el turno mientras otro guardia lo tenga', () => {
    signInForTest('security-relief');

    expect(service.mine()).toBeNull();
    expectError(() => service.start(), 'shift-in-progress');
  });

  it('entregar el turno guarda el resumen y avisa al personal de seguridad', () => {
    signInForTest('security');

    const shift = service.handOver('Todo en orden.', false);

    expect(shiftStatus(shift)).toBe('awaiting-reception');
    expect(shift.handover).toMatchObject({ insideByType: { moto: 7, bicicleta: 3, scooter: 2 }, entries: 13, exits: 2 });
    expect(service.active()).toBeNull();

    signInForTest('security-relief');
    expect(TestBed.inject(NotificationService).items()[0].title).toBe('Turno por recibir');
  });

  it('quien entrega no puede recibir su propio turno, y el relevo no empieza sin recibirlo', () => {
    signInForTest('security');
    service.handOver('', false);

    expectError(() => service.receive({ countMatches: true, notes: '' }), 'own-handover');

    signInForTest('security-relief');
    expectError(() => service.start(), 'handover-pending');
  });

  it('recibir con el conteo correcto empieza el turno del relevo', () => {
    signInForTest('security');
    const handed = service.handOver('', false);

    signInForTest('security-relief');
    const mine = service.receive({ countMatches: true, notes: '' });

    expect(mine.receivedFromShiftId).toBe(handed.id);
    expect(service.mine()?.guardName).toBe('Diana Morales');
    expect(service.toReceive()).toBeNull();
  });

  it('si el conteo no coincide exige explicarlo y crea una incidencia', () => {
    const incidents = TestBed.inject(IncidentService);
    const before = incidents.unresolved().length;

    signInForTest('security');
    service.handOver('', false);

    signInForTest('security-relief');
    expectError(() => service.receive({ countMatches: false, notes: '  ' }), 'missing-notes');

    service.receive({ countMatches: false, notes: 'Hay una bicicleta de más.' });

    expect(incidents.unresolved()).toHaveLength(before + 1);
    expect(incidents.items()[0].title).toBe('Diferencia en el conteo al recibir el turno');
  });

  it('cerrar la jornada no deja nada por recibir y permite abrir la siguiente', () => {
    signInForTest('security');
    service.handOver('Cierre normal.', true);

    expect(service.awaitingReception()).toBeNull();
    expect(service.lastClosedDay()?.guardName).toBe('Carlos Ramírez');

    signInForTest('security-relief');
    expect(service.start().guardName).toBe('Diana Morales');
  });
});
