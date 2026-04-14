import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    data: { roles: ['Administrador Sistema', 'ADMIN'] }
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
