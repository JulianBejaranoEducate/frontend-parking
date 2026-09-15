import { Component, type ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AFFILIATION_LABELS, AuthService } from '../../core/services/auth.service';
import { Notifications } from '../notifications/notifications';

/**
 * Barra superior de los dashboards: buscador al centro, notificaciones y menú
 * de cuenta a la derecha. Vive aparte para que la reutilicen las demás vistas
 * (seguridad, administración) sin duplicar el marcado.
 */
@Component({
  imports: [Notifications],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeProfile()',
  },
})
export class Header {
  /** Estado del cajón lateral, para reflejarlo en el botón de hamburguesa. */
  readonly menuOpen = input(false);
  /** Texto de ayuda del buscador; cada rol explica qué se puede buscar. */
  readonly searchPlaceholder = input('Buscar');
  readonly menuToggled = output<void>();
  /** Búsqueda enviada, ya recortada; nunca vacía. */
  readonly searched = output<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileRef = viewChild<ElementRef<HTMLElement>>('profile');

  protected readonly user = this.auth.user;
  protected readonly profileOpen = signal(false);
  /** En móvil el buscador se despliega sobre la barra al pulsar la lupa. */
  protected readonly searchExpanded = signal(false);

  protected readonly displayName = computed(() => this.user()?.displayName ?? 'Invitado');
  protected readonly email = computed(() => this.user()?.email ?? '');
  protected readonly photoUrl = computed(() => this.user()?.photoUrl ?? null);

  protected readonly initials = computed(() =>
    this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  /** Ej. "Estudiante · Administración de Empresas". */
  protected readonly affiliationLine = computed(() => {
    const user = this.user();

    if (!user?.affiliation) {
      return null;
    }

    const label = AFFILIATION_LABELS[user.affiliation];
    return user.program ? `${label} · ${user.program}` : label;
  });

  protected toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
  }

  protected expandSearch(): void {
    this.closeProfile();
    this.searchExpanded.set(true);
  }

  protected collapseSearch(): void {
    this.searchExpanded.set(false);
  }

  protected submitSearch(event: Event, value: string): void {
    event.preventDefault();
    const query = value.trim();

    if (query) {
      this.searched.emit(query);
    }
  }

  /** TODO: llevará a la configuración de la cuenta cuando exista esa sección. */
  protected openSettings(): void {
    this.closeProfile();
  }

  protected async logout(): Promise<void> {
    this.closeProfile();
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  /** Cierra el menú de cuenta al pulsar en cualquier otro sitio. */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.profileOpen()) {
      return;
    }

    const container = this.profileRef()?.nativeElement;

    // composedPath se calcula al disparar el evento: sigue siendo fiable aunque
    // el elemento pulsado desaparezca del DOM durante el clic.
    if (container && !event.composedPath().includes(container)) {
      this.closeProfile();
    }
  }
}
