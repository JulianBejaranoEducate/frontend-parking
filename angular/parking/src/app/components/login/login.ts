import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { homeFor } from '../../core/guards/auth.guards';
import { AuthService, type AuthUser, type DemoProfile } from '../../core/services/auth.service';

/** Accesos directos del modo demostración, además del usuario institucional. */
const DEMO_SHORTCUTS: readonly { profile: Exclude<DemoProfile, 'user'>; label: string }[] = [
  { profile: 'admin', label: 'Administración' },
  { profile: 'security', label: 'Guardia Carlos' },
  { profile: 'security-relief', label: 'Guardia Diana' },
];

/**
 * Pantalla de acceso: inicio de sesión institucional con Microsoft, entrada
 * de visitantes y, en demostración, accesos a los demás roles.
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
  protected readonly loading = this.auth.loading;
  protected readonly error = this.auth.error;
  protected readonly demoMode = this.auth.demoMode;
  protected readonly demoShortcuts = DEMO_SHORTCUTS;
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    // Con la sesión ya abierta (p. ej. al abrir la app instalada), no tiene
    // sentido volver a pedir acceso: cada rol va directo a su inicio.
    if (this.auth.user()) {
      void this.enterDashboard(this.auth.user());
      return;
    }

    // En la app híbrida el acceso se hace por redirección: al volver de
    // Microsoft se aterriza aquí de nuevo y hay que recoger la sesión.
    void this.resumeRedirectSignIn();
  }

  /**
   * Acceso institucional: delega en Firebase, que lleva al login de Microsoft.
   * Al volver, el rol decide el dashboard de destino.
   */
  protected async signInWithMicrosoft(): Promise<void> {
    if (this.loading()) {
      return;
    }

    await this.enterDashboard(await this.auth.loginWithMicrosoft());
  }

  /**
   * Solo en demostración: entra con una cuenta simulada de administración o de
   * seguridad para recorrer su dashboard.
   *
   * @param profile Cuenta de demostración elegida.
   */
  protected async signInAsDemo(profile: Exclude<DemoProfile, 'user'>): Promise<void> {
    if (this.loading()) {
      return;
    }

    await this.enterDashboard(await this.auth.loginAsDemo(profile));
  }

  /** Acceso de visitantes: sin cuenta institucional, registro temporal. */
  protected goToVisitors(): void {
    this.auth.continueAsVisitor();
    void this.router.navigate(['/visitantes']);
  }

  protected dismissError(): void {
    this.auth.clearError();
  }

  private async resumeRedirectSignIn(): Promise<void> {
    await this.enterDashboard(await this.auth.resumeRedirectSignIn());
  }

  /** Lleva a cada rol a su propio inicio (ver `ROLE_HOME`). */
  private async enterDashboard(user: AuthUser | null): Promise<void> {
    if (!user) {
      return;
    }

    await this.router.navigateByUrl(homeFor(user));
  }
}
