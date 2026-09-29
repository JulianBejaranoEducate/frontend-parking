import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { DEMO_STUDENT_UID } from '../demo/seed-registrations';
import type { AppNotification } from '../models/notification';
import { createId } from '../utils/id';
import { AuthService, type AuthUser } from './auth.service';

/**
 * Avisos de la aplicación. Cada uno va dirigido a una persona (su uid) o a un
 * equipo completo (administración o seguridad), y cada quien ve solo los suyos.
 *
 * TODO: datos de demostración. Llegarán de Firestore (o de Firebase Cloud
 * Messaging en la app instalada) cuando exista el backend.
 */

const STORAGE_KEY = 'notifications';

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

function seedNotifications(): AppNotification[] {
  return [
    {
      id: 'n-1',
      kind: 'availability',
      audience: DEMO_STUDENT_UID,
      title: 'Zona de scooters casi llena',
      message: 'Quedan 2 cupos disponibles en este momento.',
      createdAt: minutesAgo(45),
    },
    {
      id: 'n-2',
      kind: 'access',
      audience: DEMO_STUDENT_UID,
      title: 'Ingreso registrado',
      message: 'KZT45F entró a la Zona de motos.',
      createdAt: minutesAgo(96),
    },
    {
      id: 'n-3',
      kind: 'vehicle',
      audience: DEMO_STUDENT_UID,
      title: 'Vehículo en revisión',
      message: 'Tu bicicleta Bianchi está pendiente de aprobación por parte de la administración.',
      createdAt: minutesAgo(60 * 27),
    },
    {
      id: 'n-admin-1',
      kind: 'registration',
      audience: 'admins',
      title: 'Nueva solicitud de registro',
      message: 'Sofía Medina registró una moto MNB67C.',
      createdAt: minutesAgo(180),
      link: '/admin/pendientes?solicitud=reg-mnb67c',
    },
    {
      id: 'n-admin-2',
      kind: 'registration',
      audience: 'admins',
      title: 'Documentos actualizados',
      message: 'Mateo Vargas volvió a enviar la tarjeta de propiedad de ZXC90A.',
      createdAt: minutesAgo(240),
      link: '/admin/pendientes?solicitud=reg-zxc90a',
    },
    {
      id: 'n-admin-3',
      kind: 'registration',
      audience: 'admins',
      title: 'Nueva solicitud de registro',
      message: 'Valentina Ríos registró una moto QWE28F.',
      createdAt: minutesAgo(300),
      link: '/admin/pendientes?solicitud=reg-qwe28f',
    },
    {
      id: 'n-security-1',
      kind: 'access',
      audience: 'security',
      title: 'Vehículo con ingreso de ayer',
      message: 'La moto PQR71C ingresó ayer a las 6:40 p. m. y sigue dentro.',
      createdAt: minutesAgo(290),
      link: '/seguridad/resumen',
    },
  ];
}

/** Indica si un aviso le corresponde a la cuenta con la sesión abierta. */
function isFor(item: AppNotification, user: AuthUser): boolean {
  return (
    item.audience === user.uid ||
    (item.audience === 'admins' && user.role === 'admin') ||
    (item.audience === 'security' && user.role === 'security')
  );
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly _items = signal<AppNotification[]>(
    loadDemo<AppNotification[]>(STORAGE_KEY) ?? seedNotifications(),
  );

  /** Los avisos de quien tiene la sesión abierta, lo más reciente primero. */
  readonly items = computed(() => {
    const user = this.auth.user();

    if (!user) {
      return [];
    }

    return this._items()
      .filter((item) => isFor(item, user))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  readonly pendingCount = computed(() => this.items().length);

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._items()));
  }

  /**
   * Publica un aviso.
   *
   * @param notification Contenido y destinatario: un uid, `'admins'` o `'security'`.
   */
  notify(notification: Omit<AppNotification, 'id' | 'createdAt'>): void {
    this._items.update((items) => [
      { ...notification, id: createId('n'), createdAt: new Date() },
      ...items,
    ]);
  }

  /** TODO: marcarla como descartada también en el servidor. */
  dismiss(id: string): void {
    this._items.update((items) => items.filter((item) => item.id !== id));
  }
}
