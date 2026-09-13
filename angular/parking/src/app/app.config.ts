import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { applyBrandTheme } from './core/config/branding.config';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // Los parámetros de ruta y de consulta llegan como inputs del componente.
      withComponentInputBinding(),
    ),
    // Inyecta la paleta del cliente activo antes de renderizar la primera vista.
    provideAppInitializer(() => applyBrandTheme()),
  ],
};
