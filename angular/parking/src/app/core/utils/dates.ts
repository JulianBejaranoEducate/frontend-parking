/**
 * Formatos de fecha y hora para portería, en español de Colombia.
 *
 * Ojo al redactar mensajes: la hora ya termina en «a. m.» o «p. m.», así que
 * una frase no debe ponerle otro punto detrás.
 */

const DAY_MS = 86_400_000;

/**
 * Ej. "7:05 a. m.". Los espacios quedan no separables para que «a. m.» nunca
 * se parta entre dos líneas en pantallas angostas.
 */
export function clockTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ');
}

/**
 * Hora con su artículo, para frases como «a las…» o «desde las…»: en español
 * la 1 va en singular.
 *
 * @example atClock(date) // "las 7:05 a. m.", "la 1:30 p. m."
 */
export function atClock(date: Date): string {
  return `${date.getHours() % 12 === 1 ? 'la' : 'las'} ${clockTime(date)}`;
}

/** Días calendario entre la fecha y la referencia: 0 hoy, 1 ayer. */
export function calendarDaysAgo(date: Date, now: Date = new Date()): number {
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  return Math.round((startOf(now) - startOf(date)) / DAY_MS);
}

/**
 * Día relativo con hora.
 *
 * @example dayAndTime(date) // "hoy a las 7:05 a. m.", "ayer a la 1:40 p. m.", "12 sept. a las 6:40 p. m."
 */
export function dayAndTime(date: Date, now: Date = new Date()): string {
  const days = calendarDaysAgo(date, now);
  const day =
    days === 0 ? 'hoy' : days === 1 ? 'ayer' : date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  return `${day} a ${atClock(date)}`;
}

/** Hora sola si es de hoy; si no, con el día, para no confundir movimientos viejos. */
export function momentLabel(date: Date, now: Date = new Date()): string {
  return calendarDaysAgo(date, now) === 0 ? clockTime(date) : dayAndTime(date, now);
}
