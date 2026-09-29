/*  ¿Para qué sirve?

    Es el que agrega automáticamente el token a cada petición saliente
*/
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environments';
import { isFirebaseConfigured } from '../config/firebase.config';

/**
 * Agrega `Authorization: Bearer <token>` a las peticiones hacia nuestro propio
 * backend, cuando hay una sesión real de Firebase.
 *
 * Solo toca las peticiones que empiezan por `environment.apiUrl`: nunca hay que
 * mandarle nuestro token a un servicio de un tercero (p. ej. el propio Firebase).
 *
 * El backend todavía no exige este token en ninguna ruta (fase de conexión,
 * ver planeacion-desarrollo.md): primero se prueba que los datos viajen bien.
 * Mientras la app siga en modo demostración (sin Firebase configurado, ADR-005)
 * no existe una sesión real de la que sacar un token, así que este interceptor
 * simplemente no agrega nada y deja pasar la petición igual.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isFirebaseConfigured() || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return from(withToken(req)).pipe(switchMap((request) => next(request)));
};

async function withToken(req: HttpRequest<unknown>): Promise<HttpRequest<unknown>> {
  // Import dinámico: el peso de firebase/auth solo se descarga si hace falta.
  const { firebaseAuth } = await import('../services/microsoft-auth');
  const user = firebaseAuth().currentUser;

  if (!user) {
    return req;
  }

  const token = await user.getIdToken();
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
