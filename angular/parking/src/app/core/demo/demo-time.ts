/**
 * Fechas relativas a "ahora" para los datos de demostración.
 *
 * Los datos de ejemplo se generan contra la hora actual para que el
 * dashboard siempre se vea vivo: "ingresó hace 40 min", "turno desde las 7:00".
 */

/**
 * Momento de hace `minutes` minutos.
 *
 * @param minutes Minutos hacia atrás.
 * @param now Referencia; por defecto, la hora actual.
 */
export function minutesAgo(minutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - minutes * 60_000);
}

/**
 * Fecha de hace `daysAgo` días a la hora indicada (hora local).
 *
 * @example daysAgoAt(1, 18, 40) // ayer a las 6:40 p. m.
 */
export function daysAgoAt(daysAgo: number, hour: number, minute: number, now: Date = new Date()): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}
