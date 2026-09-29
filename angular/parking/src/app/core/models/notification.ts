/** Aviso dirigido a una persona o a todo un equipo (administración o seguridad). */
export type NotificationKind = 'vehicle' | 'availability' | 'access' | 'registration' | 'shift' | 'system';

/**
 * 'admins' llega a todo el equipo de administración y 'security' a todo el
 * personal de seguridad; cualquier otro valor es el uid de una persona.
 */
export type NotificationAudience = 'admins' | 'security' | (string & {});

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  audience: NotificationAudience;
  title: string;
  message: string;
  createdAt: Date;
  /** Ruta que abre el aviso al pulsarlo, p. ej. la solicitud por revisar. */
  link?: string;
}

/** Ej. "hace 45 min", "hace 2 h", "hace 3 días". */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));

  if (minutes < 1) {
    return 'ahora';
  }

  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
