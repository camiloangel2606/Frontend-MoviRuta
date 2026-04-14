import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { SecurityLogger } from '../utils/security-logger';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: any) => {
      if (error.status === 401) {
        SecurityLogger.warn('Session', 'Respuesta 401 recibida, se invalida la sesion activa', {
          url: req.url
        });
        auth.expireSession();
      }

      return throwError(() => error);
    })
  );
};
