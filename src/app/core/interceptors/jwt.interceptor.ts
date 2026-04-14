import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { SecurityLogger } from '../utils/security-logger';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();

    if (token && request.url.includes('localhost:5050')) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          SecurityLogger.warn('Session', 'JWT invalido o expirado');
          this.auth.expireSession();
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url }
          });
        }

        return throwError(() => error);
      })
    );
  }
}
