import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SecurityLogger } from '../utils/security-logger';

export const verify2faGuard: CanActivateFn = () => {
  const router = inject(Router);

  const navigation = router.getCurrentNavigation();
  let email = navigation?.extras.state?.['email'];

  if (!email) {
    email = history.state?.email;
  }

  if (!email) {
    email = sessionStorage.getItem('2fa_email');
  }

  if (email && typeof email === 'string' && email.includes('@')) {
    sessionStorage.setItem('2fa_email', email);
    return true;
  }

  SecurityLogger.warn('2FA', 'Acceso directo bloqueado al formulario de verificacion');
  router.navigate(['/login']);
  return false;
};
