import {
  type ParkingZone,
  type Stay,
  averageStayDurationMs,
  entriesByVehicle,
  formatDuration,
  freeSpots,
  occupancyRatio,
  stayDurationMs,
  staysWithinDays,
  zoneStatus,
} from './parking';

describe('modelo de parqueadero', () => {
  const now = new Date('2026-09-13T12:00:00');
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

  const stay = (
    id: string,
    enteredHoursAgo: number,
    exitedHoursAgo: number | null,
    type: Stay['vehicle']['type'] = 'moto',
  ): Stay => ({
    id,
    vehicle: type === 'moto' ? { type, plate: 'KZT45F' } : { type },
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

  const zone = (capacity: number, occupied: number): ParkingZone => ({
    id: '1',
    name: 'Zona de motos',
    accepts: 'moto',
    capacity,
    occupied,
  });

  it('clasifica la zona: disponible, casi llena desde el 85 % o sin cupos', () => {
    expect(zoneStatus(zone(100, 50))).toBe('available');
    expect(zoneStatus(zone(100, 85))).toBe('filling');
    expect(zoneStatus(zone(100, 100))).toBe('full');
  });

  it('nunca da puestos libres negativos ni ocupación mayor al 100 %', () => {
    expect(freeSpots(zone(10, 12))).toBe(0);
    expect(occupancyRatio(zone(10, 12))).toBe(1);
    expect(occupancyRatio(zone(0, 0))).toBe(0);
  });

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

  it('promedia la duración de las estancias dadas; 0 si no hay ninguna', () => {
    expect(averageStayDurationMs([], now)).toBe(0);
    expect(formatDuration(averageStayDurationMs([stay('a', 2, null), stay('b', 4, 2)], now))).toBe('2 h 0 min');
  });

  it('reparte las entradas por vehículo, de más a menos', () => {
    const counts = entriesByVehicle([stay('a', 1, null), stay('b', 3, 2), stay('c', 1, null, 'bicicleta')]);

    expect(counts).toEqual([
      { vehicle: { type: 'moto', plate: 'KZT45F' }, label: 'KZT45F', count: 2 },
      { vehicle: { type: 'bicicleta' }, label: 'Bicicleta', count: 1 },
    ]);
  });
});
