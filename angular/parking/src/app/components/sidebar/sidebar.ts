import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';

export interface SidebarItem {
  id: string;
  label: string;
  /** Trazado del icono, en el lienzo de 24x24 que usan todas las pantallas. */
  icon: string;
  /** Sin ruta, la opción todavía no lleva a ningún lado: solo marca la selección. */
  route?: string;
  /** Contador visible junto a la opción, p. ej. solicitudes por revisar. */
  badge?: number;
  /** Qué cuenta el contador, para lectores de pantalla: "por revisar". */
  badgeLabel?: string;
}

/** Opciones del dashboard de usuarios institucionales. */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'registrar-vehiculo',
    label: 'Registrar vehículo',
    icon: 'M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1',
    route: '/vehiculos/registrar',
  },
  {
    id: 'parqueaderos',
    label: 'Parqueaderos',
    icon: 'M5 3h6.5C15.1 3 17 5.2 17 8.4s-1.9 5.4-5.5 5.4H9V21H5zm4 3.4v4h2.2c1.3 0 2-.7 2-2s-.7-2-2-2z',
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icon: 'M4 20h16v2H4a2 2 0 0 1-2-2V3h2zm3-2V9h3v9zm5 0V4h3v14zm5 0v-6h3v6z',
  },
];

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
  readonly items = input<readonly SidebarItem[]>(SIDEBAR_ITEMS);
  /** Texto bajo el nombre del producto, p. ej. "Administración". */
  readonly context = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly brand = BRAND;

  /** Selección de las opciones que todavía no tienen ruta. */
  protected readonly activeId = signal<string | null>(null);

  protected select(item: SidebarItem): void {
    this.activeId.set(item.id);
    // En móvil el menú tapa el contenido: al elegir algo se cierra solo.
    this.closed.emit();
  }
}
