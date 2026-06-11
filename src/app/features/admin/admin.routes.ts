import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

// Roles del JWT (ms-security emite todos en MAYÚSCULAS, sin espacios).
const ADMIN_EMPRESA_ROLES = ['ADMINISTRADOR', 'SUPERVISOR'];
const ADMIN_SISTEMA_ROLES = ['ADMINISTRADOR'];

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'buses',
    loadComponent: () => import('./components/flota-buses/flota-buses.component')
      .then(m => m.FlotaBusesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'buses/:id/incidentes',
    loadComponent: () => import('./components/incidentes-bus/incidentes-bus.component')
      .then(m => m.IncidentesBusComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'paraderos',
    loadComponent: () => import('./components/gestion-paraderos/gestion-paraderos.component')
      .then(m => m.GestionParaderosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'rutas',
    loadComponent: () => import('./components/gestion-rutas/gestion-rutas.component')
      .then(m => m.GestionRutasComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'programaciones',
    loadComponent: () => import('./components/programaciones/programaciones.component')
      .then(m => m.ProgramacionesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'reportes/ingresos',
    loadComponent: () => import('./components/reportes/reporte-ingresos/reporte-ingresos.component')
      .then(m => m.ReporteIngresosComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] }
  },
  {
    path: 'reportes/demografia',
    loadComponent: () => import('./components/reportes/reporte-demografia/reporte-demografia.component')
      .then(m => m.ReporteDemografiaComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'reportes/incidentes',
    loadComponent: () => import('./components/reportes/reporte-tendencia-incidentes/reporte-tendencia-incidentes.component')
      .then(m => m.ReporteTendenciaIncidentesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'roles',
    loadComponent: () => import('./components/roles/role-list/role-list.component')
      .then(m => m.RoleListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'roles/new',
    loadComponent: () => import('./components/roles/role-form/role-form.component')
      .then(m => m.RoleFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'roles/edit/:id',
    loadComponent: () => import('./components/roles/role-form/role-form.component')
      .then(m => m.RoleFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/user-list/user-list.component')
      .then(m => m.UserListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'user-roles/:userId',
    loadComponent: () => import('./components/user-roles/user-role-manager/user-role-manager.component')
      .then(m => m.UserRoleManagerComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'permissions',
    loadComponent: () => import('./components/permissions/permission-list/permission-list.component')
      .then(m => m.PermissionListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'permissions/new',
    loadComponent: () => import('./components/permissions/permission-form/permission-form.component')
      .then(m => m.PermissionFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'permissions/edit/:id',
    loadComponent: () => import('./components/permissions/permission-form/permission-form.component')
      .then(m => m.PermissionFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'role-permissions',
    loadComponent: () => import('./components/role-permissions/role-permission-manager/role-permission-manager.component')
      .then(m => m.RolePermissionManagerComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'sessions',
    loadComponent: () => import('./session-list.component')
      .then(m => m.SessionListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ADMIN_SISTEMA_ROLES }
  }
];
