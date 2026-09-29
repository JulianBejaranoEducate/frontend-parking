/**
 * Configuración por ambiente: la URL del backend en un solo lugar.
 *
 * Por ahora hay un solo archivo: cuando haga falta compilar para producción,
 * se reemplaza con `fileReplacements` en `angular.json`, como ya lo hace
 * Angular con el service worker (ADR-014).
 */
export const environment = {
  production: false,
  /**
   * Backend Express del proyecto `Backend_Uni-Parking`. Para probar desde el
   * celular o contra el servidor del equipo, cambiarla por su dirección
   * (p. ej. 'http://167.234.233.96:3000') sin subir ese cambio.
   */
  apiUrl: 'http://localhost:3000',
};
