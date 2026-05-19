  import { Routes } from '@angular/router';
  import { authGuard } from './core/guards/auth.guard';
  import { roleGuard } from './core/guards/role.guard';
  import { RutasComponent } from '../app/features/rutas/rutas.component';

  export const routes: Routes = [
    {
      path: '',
      redirectTo: 'dashboard',
      pathMatch: 'full'
    },
    {
      path: 'login',
      loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
      path: 'register',
      loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
      path: 'verify-2fa',
      loadComponent: () => import('./features/auth/verify-two-factor/verify-two-factor.component').then(m => m.VerifyTwoFactorComponent)
    },
    {
      path: 'forgot-password',
      loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    {
      path: 'reset-password',
      loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
    },
    {
      path: 'auth/callback',
      loadComponent: () => import('./features/auth/test/auth-callback.component').then(m => m.AuthCallbackComponent)
    },
    {
      path: 'dashboard',
      loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      canActivate: [authGuard]
    },
    {
      path: 'profile',
      loadComponent: () =>
        import('./features/profile/components/profile/profile.component')
          .then(m => m.ProfileComponent),
      canActivate: [authGuard]
    },
    {
      path: 'admin',
      loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
      canActivate: [authGuard, roleGuard],
      data: { roles: ['Administrador Sistema', 'ADMIN'] }
    },
    {
      path: 'test',
      loadComponent: () => import('./features/auth/test/test.component').then(m => m.TestComponent)
    },
    {
      path: 'rutas',
      component: RutasComponent
    },
    {
      path: 'movilidad',
      children: [
        {
          path: 'boletos',
          // Cargamos directamente el componente de forma perezosa (Lazy Loading)
          loadComponent: () => import('../app/features/boletos/boletos.component').then(m => m.BoletosComponent)
        }
      ]
    },
    {
      path: '**',
      redirectTo: 'dashboard'
    }
  ];