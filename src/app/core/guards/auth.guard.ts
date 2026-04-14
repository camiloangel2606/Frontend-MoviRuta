import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SecurityLogger } from '../utils/security-logger';

export const authGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    SecurityLogger.info('JWT', 'Acceso permitido por token valido');
    return true;
  }

  SecurityLogger.warn('Guard', 'Acceso bloqueado por falta de autenticacion');
  router.navigate(['/login']);
  return false;
};
