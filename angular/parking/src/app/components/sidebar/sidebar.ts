import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import type { NavigationItem } from '../../core/navigation/dashboard-navigation';

/**
 * Barra lateral de los dashboards: nombre del producto, contexto del rol y menú.
 *
 * No trae opciones propias: las recibe del layout, que a su vez las toma del
 * grupo de rutas del rol (ADR-010). Sin opciones, no muestra ningún menú.
 */
@Component({
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class Sidebar {
  /** En escritorio arranca desplegada; en móvil se abre desde la hamburguesa. */
  readonly open = input(false);
  /** Opciones del menú del rol activo. */
  readonly items = input<readonly NavigationItem[]>([]);
  /** Texto bajo el nombre del producto, p. ej. "Administración". */
  readonly context = input<string | null>(null);
  /** Pide cerrar el cajón: al elegir una opción o al pulsar Escape. */
  readonly closed = output<void>();

  protected readonly brand = BRAND;

  /** Selección de las opciones que todavía no tienen ruta. */
  protected readonly activeId = signal<string | null>(null);

  protected select(item: NavigationItem): void {
    this.activeId.set(item.id);
    // En móvil el menú tapa el contenido: al elegir algo se cierra solo.
    this.closed.emit();
  }
}
