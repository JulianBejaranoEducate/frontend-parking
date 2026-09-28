import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { homeFor } from '../../core/guards/auth.guards';
import { AuthService, type DemoProfile } from '../../core/services/auth.service';

/** Accesos del personal de seguridad. */
const DEMO_SHORTCUTS: readonly { profile: DemoProfile; label: string }[] = [
  { profile: 'security', label: 'Guardia Carlos' },
  { profile: 'security-relief', label: 'Guardia Diana' },
];

/**
 * Pantalla de acceso: registro de visitantes y acceso simulado del personal de
 * seguridad. El inicio de sesión de la comunidad y de la administración llega
 * con el backend.
 */
@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Todo el texto y la identidad visible salen de la marca activa. */
  protected readonly brand = BRAND;
  protected readonly demoShortcuts = DEMO_SHORTCUTS;
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    // Con la sesión ya abierta (p. ej. al abrir la app instalada) va directo a su inicio.
    const user = this.auth.user();

    if (user) {
      void this.router.navigateByUrl(homeFor(user));
    }
  }

  /**
   * Entra con la cuenta simulada de un guardia.
   *
   * @param profile Guardia elegido.
   */
  protected signInAsDemo(profile: DemoProfile): void {
    void this.router.navigateByUrl(homeFor(this.auth.loginAsDemo(profile)));
  }

  /** Abre el formulario de visitantes, que no necesita sesión. */
  protected goToVisitors(): void {
    void this.router.navigate(['/visitantes']);
  }
}
