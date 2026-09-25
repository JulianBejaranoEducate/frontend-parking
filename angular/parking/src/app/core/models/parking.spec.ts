import {
  type MovementAnnulment,
  type ParkingStay,
  formatDuration,
  isInside,
  isLongStay,
  movementsOf,
  occupancyByType,
  stayDurationMs,
  staysWithinDays,
} from './parking';

describe('modelo de parqueadero', () => {
  const now = new Date('2026-09-13T12:00:00');
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

  const audit = { guardUid: 'g1', guardName: 'Guardia de prueba', shiftId: null, method: 'plate-photo' } as const;

  const stay = (
    id: string,
    enteredHoursAgo: number,
    exitedHoursAgo: number | null,
    type: ParkingStay['vehicle']['type'] = 'moto',
  ): ParkingStay => ({
    id,
    vehicle: type === 'moto' ? { type, plate: 'KZT45F' } : { type },
    zoneName: 'Zona de motos',
    enteredAt: hoursAgo(enteredHoursAgo),
    exitedAt: exitedHoursAgo === null ? null : hoursAgo(exitedHoursAgo),
    subject: { kind: 'institutional', uid: 'demo-uid', registrationId: 'reg-kzt45f', fullName: 'Julian Bejarano' },
    entry: audit,
    exit: exitedHoursAgo === null ? null : audit,
  });

  const stays = [
    stay('hoy', 2, null),
    stay('ayer', 30, 25),
    stay('semana', 6 * 24, 6 * 24 - 5),
    stay('mes', 20 * 24, 20 * 24 - 4),
  ];

  it('filtra por ventanas móviles contadas desde ahora', () => {
    expect(staysWithinDays(stays, 1, now).map((s) => s.id)).toEqual(['hoy']);
    expect(staysWithinDays(stays, 7, now).map((s) => s.id)).toEqual(['hoy', 'ayer', 'semana']);
    expect(staysWithinDays(stays, 30, now)).toHaveLength(4);
  });

  it('mide la estancia terminada de la entrada a la salida', () => {
    expect(formatDuration(stayDurationMs(stay('x', 30, 25), now))).toBe('5 h 0 min');
  });

  it('una estancia en curso cuenta hasta ahora', () => {
    expect(formatDuration(stayDurationMs(stay('x', 2, null), now))).toBe('2 h 0 min');
  });

  it('formatea duraciones cortas solo en minutos y nunca negativas', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(-5_000)).toBe('0 min');
  });

  it('cada estancia da un ingreso y, si terminó, una salida; lo más reciente primero', () => {
    const movements = movementsOf([stay('ayer', 30, 25), stay('hoy', 2, null)]);

    expect(movements.map((movement) => movement.id)).toEqual(['hoy:entry', 'ayer:exit', 'ayer:entry']);
  });

  it('la ocupación cuenta solo los ingresos abiertos, por tipo de vehículo', () => {
    const counts = occupancyByType([stay('a', 1, null), stay('b', 3, 2), stay('c', 1, null, 'bicicleta')]);

    expect(counts).toEqual({ moto: 1, bicicleta: 1, scooter: 0 });
  });

  it('una estancia es larga cuando supera el umbral y sigue abierta', () => {
    expect(isLongStay(stay('a', 13, null), 12, now)).toBe(true);
    expect(isLongStay(stay('b', 11, null), 12, now)).toBe(false);
    expect(isLongStay(stay('c', 30, 25), 12, now)).toBe(false);
  });

  describe('anulaciones (ADR-018)', () => {
    const annulment: MovementAnnulment = { at: now, guardUid: 'g1', guardName: 'Guardia de prueba', reason: 'Placa equivocada' };

    it('un ingreso anulado no está dentro, no ocupa puesto y nunca es estancia larga', () => {
      const annulled: ParkingStay = { ...stay('anulado', 20, null), entryAnnulment: annulment };

      expect(isInside(annulled)).toBe(false);
      expect(occupancyByType([annulled, stay('vigente', 1, null)])).toEqual({ moto: 1, bicicleta: 0, scooter: 0 });
      expect(isLongStay(annulled, 12, now)).toBe(false);
    });

    it('lo anulado sigue en la bitácora, marcado, junto a lo vigente', () => {
      const annulledEntry: ParkingStay = { ...stay('anulado', 1, null), entryAnnulment: annulment };
      const reopened: ParkingStay = {
        ...stay('reabierta', 3, null),
        annulledExits: [{ exitedAt: hoursAgo(2), audit, annulment }],
      };

      const movements = movementsOf([annulledEntry, reopened]);

      expect(isInside(reopened)).toBe(true);
      expect(movements.map((movement) => [movement.id, movement.kind, movement.annulment?.reason ?? null])).toEqual([
        ['anulado:entry', 'entry', 'Placa equivocada'],
        ['reabierta:exit-anulada-0', 'exit', 'Placa equivocada'],
        ['reabierta:entry', 'entry', null],
      ]);
    });

    it('una salida sin ingreso aparece solo como salida', () => {
      const exitOnly: ParkingStay = { ...stay('sin-ingreso', 1, 1), flags: { missingEntry: true } };

      expect(movementsOf([exitOnly]).map((movement) => movement.id)).toEqual(['sin-ingreso:exit']);
    });

    it('si se anula el ingreso, su salida también cuenta como anulada', () => {
      const movements = movementsOf([{ ...stay('cerrada', 5, 4), entryAnnulment: annulment }]);

      expect(movements).toHaveLength(2);
      expect(movements.every((movement) => movement.annulment === annulment)).toBe(true);
    });
  });
});
