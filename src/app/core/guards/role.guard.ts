import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SecurityLogger } from '../utils/security-logger';

export const roleGuard: CanActivateFn = (route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    SecurityLogger.warn('Guard', 'Acceso admin bloqueado por falta de autenticacion');
    router.navigate(['/login']);
    return false;
  }

  const requiredRoles: string[] = route.data?.['roles'] || [];
  if (requiredRoles.length === 0) {
    return true;
  }

  const userRoles = auth.getUserRoles();
  SecurityLogger.info('Roles', 'Evaluando acceso por roles', { requiredRoles, userRoles });
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

  if (hasRequiredRole) {
    SecurityLogger.info('Roles', 'Acceso concedido por rol');
    return true;
  }

  SecurityLogger.warn('Guard', 'Acceso denegado por roles insuficientes', { requiredRoles, userRoles });
  router.navigate(['/dashboard'], {
    queryParams: { error: 'access-denied' }
  });

  return false;
};
