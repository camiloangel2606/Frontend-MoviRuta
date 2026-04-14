import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { catchError, throwError } from 'rxjs';

function getFriendlyMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta nuevamente en unos minutos.';
  }

  if (error.status === 400) {
    return 'La solicitud no se pudo procesar. Revisa la informacion ingresada.';
  }

  if (error.status === 401) {
    return 'No se pudo completar la accion. Verifica tus credenciales o intenta mas tarde.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta accion.';
  }

  if (error.status === 404) {
    return 'No se encontro la informacion solicitada.';
  }

  if (error.status >= 500) {
    return 'El servicio no esta disponible en este momento. Intenta mas tarde.';
  }

  return error.error?.message || 'Ocurrio un problema inesperado. Intenta nuevamente.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const shouldSkipToast =
        req.url.includes('/public/oauth2/login/') ||
        (error.status === 401 && !req.url.includes('/public/'));

      if (!shouldSkipToast) {
        toast.error(getFriendlyMessage(error));
      }

      return throwError(() => error);
    })
  );
};
