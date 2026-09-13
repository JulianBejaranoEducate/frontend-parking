import { type ParkingStay, formatDuration, stayDurationMs, staysWithinDays } from './parking';

describe('modelo de parqueadero', () => {
  const now = new Date('2026-09-13T12:00:00');
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

  const stay = (id: string, enteredHoursAgo: number, exitedHoursAgo: number | null): ParkingStay => ({
    id,
    vehicle: { type: 'moto', plate: 'KZT45F' },
    zoneName: 'Zona de motos',
    enteredAt: hoursAgo(enteredHoursAgo),
    exitedAt: exitedHoursAgo === null ? null : hoursAgo(exitedHoursAgo),
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
});
