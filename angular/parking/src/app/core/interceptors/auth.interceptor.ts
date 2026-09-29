import { type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environments';
import { FIREBASE_AUTH, type FirebaseAuthGateway } from '../services/auth/firebase-auth';

/**
 * Agrega `Authorization: Bearer <token>` a las peticiones hacia nuestro backend
 * cuando hay una sesión de Firebase. El backend lo exige en todas las rutas salvo
 * `POST /visitors` y `POST /users` (ADR-023).
 *
 * Solo toca las peticiones que empiezan por `environment.apiUrl`: nunca hay que
 * mandarle nuestro token a un servicio de un tercero.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return from(withToken(req, inject(FIREBASE_AUTH))).pipe(switchMap((request) => next(request)));
};

async function withToken(req: HttpRequest<unknown>, firebase: FirebaseAuthGateway): Promise<HttpRequest<unknown>> {
  const user = await firebase.currentUser();

  if (!user) {
    return req;
  }

  const token = await user.getIdToken();
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
