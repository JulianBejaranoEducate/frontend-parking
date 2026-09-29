/**
 * Persistencia del modo demostración.
 *
 * Mientras Firebase no esté configurado, solicitudes, avisos, estancias, turnos
 * e incidencias se guardan en el navegador para que los flujos entre roles
 * (registrar como estudiante, revisar como administración, entregar y recibir
 * turnos en portería) sobrevivan a una recarga de la página.
 *
 * TODO: todo lo de esta carpeta desaparece cuando existan Firestore y Storage.
 */
import { isFirebaseConfigured } from '../config/firebase.config';

/**
 * Prefijo de las claves. Se sube la versión cuando cambia la forma de los datos
 * de ejemplo, para que nadie arrastre datos viejos incompatibles.
 * v2 (Fase 1): estancias con persona y auditoría, turnos y vehículos aprobados.
 */
const PREFIX = 'uniparking.demo.v2.';

/** Fechas ISO completas: "2026-09-13T12:00:00.000Z". */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function revive(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value;
}

export function isDemoMode(): boolean {
  return !isFirebaseConfigured();
}

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    // Safari en modo privado y algunos WebView lanzan al acceder al almacenamiento.
    return null;
  }
}

export function loadDemo<T>(key: string, kind: 'local' | 'session' = 'local'): T | null {
  if (!isDemoMode()) {
    return null;
  }

  try {
    const raw = storage(kind)?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw, revive) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve false si no se pudo guardar, normalmente porque las fotos llenaron
 * la cuota del navegador (unos 5 MB). Los datos siguen en memoria igual.
 */
export function saveDemo(key: string, value: unknown, kind: 'local' | 'session' = 'local'): boolean {
  if (!isDemoMode()) {
    return false;
  }

  try {
    storage(kind)?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[demo] No se pudo guardar "${key}" en el navegador.`, error);
    return false;
  }
}

export function clearDemo(key: string, kind: 'local' | 'session' = 'local'): void {
  try {
    storage(kind)?.removeItem(PREFIX + key);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}
