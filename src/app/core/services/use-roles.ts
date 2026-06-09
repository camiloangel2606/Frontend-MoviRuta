import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Hook para usar roles en componentes Angular
 * 
 * Ubicación: src/app/core/services/use-roles.ts
 * 
 * Uso en componentes:
 * 
 * import { useRoles } from '../../core/services/use-roles';
 * 
 * export class MyComponent {
 *   roles = useRoles();
 *   
 *   someMethod() {
 *     if (this.roles.isAdmin) {
 *       console.log('Es administrador');
 *     }
 *   }
 * }
 * 
 * En templates:
 * <div *ngIf="roles.isAdmin">Panel de Admin</div>
 */
export const useRoles = () => {
  const authService = inject(AuthService);

  return {
    // Array de roles actuales
    roles: authService.getUserRoles(),
    
    // Observable de roles (para *ngIf async en templates)
    roles$: authService.userRoles$,
    
    // Helpers para roles específicos
    isAdmin: authService.hasRole('ADMINISTRADOR'),
    isModerator: authService.hasRole('MODERADOR'),
    isCitizen: authService.hasRole('CIUDADANO'),
    
    // Método genérico para verificar cualquier rol
    hasRole: (role: string) => authService.hasRole(role)
  };
};
