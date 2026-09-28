import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { type Params, RouterLink } from '@angular/router';
import { type AppNotification, timeAgo } from '../../core/models/notification';

/**
 * Campana de notificaciones con su panel desplegable. Es autónoma: abre, cierra
 * y descarta por su cuenta, así que cualquier barra superior puede incluirla.
 *
 * Todavía no hay avisos: llegarán del backend. Mientras tanto el panel muestra
 * su estado vacío.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-notifications',
  styleUrl: './notifications.css',
  templateUrl: './notifications.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class Notifications {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** true mientras el panel está desplegado. */
  protected readonly open = signal(false);
  /** Avisos pendientes. Sin backend todavía: vacía. */
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly pendingCount = computed(() => this.items().length);

  /** Más de nueve se resume, como hacen las apps: el número exacto está dentro. */
  protected readonly badgeText = computed(() => {
    const count = this.pendingCount();
    return count > 9 ? '9+' : String(count);
  });

  /** Sin número visible para lectores de pantalla, la cuenta va en la etiqueta. */
  protected readonly triggerLabel = computed(() => {
    const count = this.pendingCount();

    if (count === 0) {
      return 'Notificaciones';
    }

    return count === 1 ? 'Notificaciones, 1 pendiente' : `Notificaciones, ${count} pendientes`;
  });

  /** Abre o cierra el panel desde la campana. */
  protected toggle(): void {
    this.open.update((open) => !open);
  }

  /** Cierra el panel (también con Escape). */
  protected close(): void {
    this.open.set(false);
  }

  /** Quita un aviso de la lista. */
  protected dismiss(item: AppNotification): void {
    this.items.update((items) => items.filter((candidate) => candidate.id !== item.id));
  }

  /** TODO: llevará al panel de configuración de notificaciones. */
  protected openSettings(): void {
    // Sin funcionalidad por ahora: la sección se construye más adelante.
  }

  protected timeAgo(date: Date): string {
    return timeAgo(date);
  }

  /** "/admin/pendientes?solicitud=x" → "/admin/pendientes". */
  protected linkPath(link: string): string {
    return link.split('?')[0];
  }

  /** "/admin/pendientes?solicitud=x" → { solicitud: "x" }. */
  protected linkQuery(link: string): Params {
    const query = link.split('?')[1];
    return query ? Object.fromEntries(new URLSearchParams(query)) : {};
  }

  /** Cierra el panel al pulsar en cualquier otro sitio de la página. */
  protected onDocumentClick(event: MouseEvent): void {
    // composedPath se calcula al disparar el evento, así que sigue siendo
    // fiable aunque el aviso descartado desaparezca del DOM durante el clic.
    if (this.open() && !event.composedPath().includes(this.host.nativeElement)) {
      this.close();
    }
  }
}
