import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { createDrawerState } from '../../core/layout/drawer-state';
import { DASHBOARD_NAVIGATION } from '../../core/navigation/dashboard-navigation';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Armazón común de los dashboards: sidebar, header y contenido (ADR-010).
 *
 * Es el mismo para usuarios, administración y seguridad, pero no conoce datos de
 * ningún rol: el menú lo aporta cada grupo de rutas con
 * `provideDashboardNavigation`, y el contenido llega por el `router-outlet`.
 *
 * Si el proyecto adopta Ionic (ADR-015), este es el único punto que cambia:
 * pasaría a usar `ion-split-pane`, `ion-menu` e `ion-router-outlet` sin tocar
 * los dashboards ni las rutas.
 */
@Component({
  imports: [Header, RouterOutlet, Sidebar],
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly drawer = createDrawerState();

  /** Menú del rol cuyo grupo de rutas está activo. */
  protected readonly navigation = inject(DASHBOARD_NAVIGATION);

  /** En escritorio el menú arranca desplegado; en móvil, cerrado. */
  protected readonly menuOpen = this.drawer.open;

  protected toggleMenu(): void {
    this.drawer.toggle();
  }

  /** En escritorio la barra convive con el contenido, así que solo se cierra en móvil. */
  protected closeMenu(): void {
    this.drawer.closeOnMobile();
  }

  /** Entrega la búsqueda del header al dashboard del rol, si la usa. */
  protected search(query: string): void {
    this.navigation.search?.submit(query);
  }
}
