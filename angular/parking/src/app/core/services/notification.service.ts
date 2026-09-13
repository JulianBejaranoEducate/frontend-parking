import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { DEMO_STUDENT_UID } from '../demo/seed-registrations';
import type { AppNotification } from '../models/notification';
import { createId } from '../utils/id';
import { AuthService } from './auth.service';

/**
 * Avisos de la aplicación. Cada uno va dirigido a una persona (su uid) o a
 * todo el equipo de administración, y cada quien ve solo los suyos.
 *
 * TODO: datos de demostración. Llegarán de Firestore (o de Firebase Cloud
 * Messaging en la app híbrida) cuando exista el panel de notificaciones.
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
  ];
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
      .filter((item) => item.audience === user.uid || (item.audience === 'admins' && user.role === 'admin'))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  readonly pendingCount = computed(() => this.items().length);

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._items()));
  }

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
