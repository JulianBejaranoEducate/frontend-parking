import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { homeFor } from '../../core/guards/auth.guards';
import { AuthService, type AuthUser } from '../../core/services/auth/auth.service';

/**
 * Pantalla de acceso: inicio de sesión institucional con Microsoft y entrada
 * al formulario de visitantes, que no necesita cuenta.
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
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    // Con la sesión ya abierta (p. ej. al abrir la app instalada) va directo a su inicio.
    if (this.auth.user()) {
      void this.enterDashboard(this.auth.user());
      return;
    }

    // En la app nativa el acceso es por redirección: al volver de Microsoft se
    // aterriza aquí de nuevo y hay que recoger la sesión.
    void this.resumeRedirectSignIn();
  }

  /** Acceso institucional: Firebase lleva al login de Microsoft y el rol decide el destino. */
  protected async signInWithMicrosoft(): Promise<void> {
    if (this.loading()) {
      return;
    }

    await this.enterDashboard(await this.auth.loginWithMicrosoft());
  }

  /** Abre el formulario de visitantes, que no necesita sesión. */
  protected goToVisitors(): void {
    this.auth.clearError();
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
    if (user) {
      await this.router.navigateByUrl(homeFor(user));
    }
  }
}
