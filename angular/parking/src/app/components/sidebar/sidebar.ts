import { Component, input, output, signal } from '@angular/core';
import { BRAND } from '../../core/config/branding.config';

export interface SidebarItem {
  id: string;
  label: string;
  /** Trazado del icono, en el lienzo de 24x24 que usan todas las pantallas. */
  icon: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'registrar-vehiculo',
    label: 'Registrar vehículo',
    icon: 'M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1',
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
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4M10.6 2h2.8l.4 2.6q.9.3 1.6.8l2.4-1.1 1.4 2.4-2 1.7q.1.5.1 1t-.1 1l2 1.7-1.4 2.4-2.4-1.1q-.7.5-1.6.8L13.4 22h-2.8l-.4-2.6q-.9-.3-1.6-.8l-2.4 1.1-1.4-2.4 2-1.7q-.1-.5-.1-1t.1-1l-2-1.7 1.4-2.4 2.4 1.1q.7-.5 1.6-.8z',
  },
];

@Component({
  imports: [],
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
  readonly closed = output<void>();

  protected readonly brand = BRAND;
  protected readonly items = SIDEBAR_ITEMS;

  /**
   * Ninguna opción arranca activa: la vista actual es el dashboard y todavía
   * ninguna de estas secciones existe. Al pulsarlas solo se marca la selección.
   */
  protected readonly activeId = signal<string | null>(null);

  protected select(item: SidebarItem): void {
    this.activeId.set(item.id);
    // En móvil el menú tapa el contenido: al elegir algo se cierra solo.
    this.closed.emit();
  }
}
