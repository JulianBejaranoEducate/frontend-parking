import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { AuthService, type AuthUser } from '../../core/services/auth.service';

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

  private async enterDashboard(user: AuthUser | null): Promise<void> {
    if (!user) {
      return;
    }

    await this.router.navigate([user.role === 'admin' ? '/admin' : '/inicio']);
  }
}
