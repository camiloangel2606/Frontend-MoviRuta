import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

const ADMIN_EMPRESA_ROLES = ['Administrador Empresa', 'Administrador Sistema', 'ADMIN'];
const ADMIN_SISTEMA_ROLES = ['Administrador Sistema', 'ADMIN'];

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    data: { roles: ADMIN_SISTEMA_ROLES }
  },
  {
    path: 'buses',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Flota de Buses', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'paraderos',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Paraderos', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'rutas',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Rutas', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'programaciones',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Programaciones', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'reportes/ingresos',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Reporte de Ingresos', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'reportes/demografia',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Reporte Demográfico', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'reportes/incidentes',
    loadComponent: () => import('../../shared/components/proximamente/proximamente.component')
      .then(m => m.ProximamenteComponent),
    canActivate: [roleGuard],
    data: { titulo: 'Reporte de Incidentes', roles: ADMIN_EMPRESA_ROLES }
  },
  {
    path: 'roles',
    loadComponent: () => import('./components/roles/role-list/role-list.component')
      .then(m => m.RoleListComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'roles/new',
    loadComponent: () => import('./components/roles/role-form/role-form.component')
      .then(m => m.RoleFormComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'roles/edit/:id',
    loadComponent: () => import('./components/roles/role-form/role-form.component')
      .then(m => m.RoleFormComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/user-list/user-list.component')
      .then(m => m.UserListComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'user-roles/:userId',
    loadComponent: () => import('./components/user-roles/user-role-manager/user-role-manager.component')
      .then(m => m.UserRoleManagerComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'permissions',
    loadComponent: () => import('./components/permissions/permission-list/permission-list.component')
      .then(m => m.PermissionListComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'permissions/new',
    loadComponent: () => import('./components/permissions/permission-form/permission-form.component')
      .then(m => m.PermissionFormComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'permissions/edit/:id',
    loadComponent: () => import('./components/permissions/permission-form/permission-form.component')
      .then(m => m.PermissionFormComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'role-permissions',
    loadComponent: () => import('./components/role-permissions/role-permission-manager/role-permission-manager.component')
      .then(m => m.RolePermissionManagerComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  },
  {
    path: 'sessions',
    loadComponent: () => import('./session-list.component')
      .then(m => m.SessionListComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
  }
];
