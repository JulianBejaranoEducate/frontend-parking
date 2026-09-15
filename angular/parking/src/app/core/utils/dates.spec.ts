import { atClock, calendarDaysAgo, dayAndTime, momentLabel } from './dates';

describe('fechas de portería', () => {
  const now = new Date('2026-09-15T10:00:00');
  const at = (value: string) => new Date(value);

  it('cuenta días calendario, no horas: anoche ya es ayer', () => {
    expect(calendarDaysAgo(at('2026-09-15T00:05:00'), now)).toBe(0);
    expect(calendarDaysAgo(at('2026-09-14T23:55:00'), now)).toBe(1);
    expect(calendarDaysAgo(at('2026-09-12T10:00:00'), now)).toBe(3);
  });

  it('pone la hora en singular solo para la 1', () => {
    expect(atClock(at('2026-09-15T13:05:00'))).toMatch(/^la 1:05/);
    expect(atClock(at('2026-09-15T01:30:00'))).toMatch(/^la 1:30/);
    expect(atClock(at('2026-09-15T07:05:00'))).toMatch(/^las 7:05/);
    expect(atClock(at('2026-09-15T12:30:00'))).toMatch(/^las 12:30/);
  });

  it('dice hoy, ayer o la fecha, con la hora', () => {
    expect(dayAndTime(at('2026-09-15T07:05:00'), now)).toMatch(/^hoy a las 7:05/);
    expect(dayAndTime(at('2026-09-14T13:40:00'), now)).toMatch(/^ayer a la 1:40/);
    expect(dayAndTime(at('2026-09-12T18:40:00'), now)).toMatch(/^12 .+ a las 6:40/);
  });

  it('en la bitácora lo de hoy lleva solo la hora', () => {
    expect(momentLabel(at('2026-09-15T07:05:00'), now)).toMatch(/^7:05/);
    expect(momentLabel(at('2026-09-14T07:05:00'), now)).toMatch(/^ayer a las 7:05/);
  });
});
