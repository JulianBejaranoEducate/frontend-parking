import {
  ApplicationConfig,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

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
    // PWA (ADR-014): el service worker guarda la aplicación para abrirla instalada
    // y sin conexión. Solo guarda archivos de la app, nunca datos personales
    // (ver ngsw-config.json). En desarrollo (ng serve) queda apagado.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
