import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SecurityLogger } from '../utils/security-logger';

export const roleGuard: CanActivateFn = (route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    SecurityLogger.warn('Guard', 'Acceso bloqueado por falta de autenticacion');
    router.navigate(['/login']);
    return false;
  }

  const requiredRoles: string[] = route.data?.['roles'] || [];
  const userRoles = auth.getUserRoles();

  // TODO: quitar este console.log cuando se valide la HU-2014 con un usuario SUPERVISOR.
  // eslint-disable-next-line no-console
  console.log('[roleGuard]', { requiredRoles, userRoles });

  if (auth.hasAnyRole(requiredRoles)) {
    SecurityLogger.info('Roles', 'Acceso concedido por rol', { requiredRoles, userRoles });
    return true;
  }

  SecurityLogger.warn('Guard', 'Acceso denegado por roles insuficientes', { requiredRoles, userRoles });
  router.navigate(['/acceso-denegado']);
  return false;
};
