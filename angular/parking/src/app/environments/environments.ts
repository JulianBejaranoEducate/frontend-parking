/* 
    ¿Para qué sirve?
    
    Guarda la URL del backend en un solo lugar
*/

/**
 * Configuración por ambiente.
 *
 * Por ahora hay un solo archivo (todavía se prueba en local): cuando haga
 * falta compilar para producción, este mismo archivo se reemplaza con
 * `fileReplacements` en `angular.json`, como ya lo hace Angular con el service
 * worker (ver ADR-014).
 */
export const environment = {
  production: false,
  /** Backend Express del proyecto `Backend_Uni-Parking`, corriendo en local. */
  apiUrl: 'http://localhost:3000',
};
