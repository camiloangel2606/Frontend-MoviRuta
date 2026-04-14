import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Permission, PermissionService } from '../../../services/permission.service';
import { RolePermission, RolePermissionService } from '../../../services/role-permission.service';
import { RoleService } from '../../../services/role.service';
import { NotificationService } from '../../../../../core/services/notification.service';

interface Role {
  id?: string;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-role-permission-manager',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './role-permission-manager.component.html',
  styleUrl: './role-permission-manager.component.scss'
})
export class RolePermissionManagerComponent implements OnInit {
  roles: Role[] = [];
  selectedRole: Role | null = null;
  allPermissions: Permission[] = [];
  allRolePermissions: RolePermission[] = [];
  rolePermissions: RolePermission[] = [];
  loading = true;
  error = '';

  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService,
    private rolePermissionService: RolePermissionService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;
    
    forkJoin({
      roles: this.roleService.getAll(),
      permissions: this.permissionService.getAll(),
      rolePermissions: this.rolePermissionService.getAll()
    }).subscribe({
      next: (data) => {
        this.roles = data.roles;
        this.allPermissions = data.permissions;
        this.allRolePermissions = data.rolePermissions;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error cargando datos';
        this.loading = false;
      }
    });
  }

  selectRole(role: Role): void {
    this.selectedRole = role;
    // Filtrar desde cache local - instantáneo
    this.rolePermissions = this.allRolePermissions.filter(rp => rp.role?.id === role.id);
    this.cdr.detectChanges();
  }

  hasPermission(permissionId: string): boolean {
    return this.rolePermissions.some(rp => rp.permission?.id === permissionId);
  }

  getRolePermissionId(permissionId: string): string | undefined {
    const rp = this.rolePermissions.find(rp => rp.permission?.id === permissionId);
    return rp?.id;
  }

  togglePermission(permission: Permission): void {
    if (!this.selectedRole?.id || !permission.id) return;

    const hasIt = this.hasPermission(permission.id);

    if (hasIt) {
      const rpId = this.getRolePermissionId(permission.id);
      if (rpId) {
        this.rolePermissionService.remove(rpId).subscribe({
          next: () => {
            // Actualizar cache local
            this.allRolePermissions = this.allRolePermissions.filter(rp => rp.id !== rpId);
            this.rolePermissions = this.rolePermissions.filter(rp => rp.id !== rpId);
            this.notificationService.add({
              type: 'permission',
              title: 'Permiso removido',
              message: `Se removio el permiso ${permission.method} ${permission.url} del rol "${this.selectedRole?.name}".`
            });
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Error quitando permiso';
            this.cdr.detectChanges();
          }
        });
      }
    } else {
      this.rolePermissionService.assign(this.selectedRole.id, permission.id).subscribe({
        next: (newRp) => {
          const rolePermissionToAdd: RolePermission = {
            id: newRp.id,
            role: this.selectedRole!,
            permission: permission
          };
          // Actualizar cache local
          this.allRolePermissions = [...this.allRolePermissions, rolePermissionToAdd];
          this.rolePermissions = [...this.rolePermissions, rolePermissionToAdd];
          this.notificationService.add({
            type: 'permission',
            title: 'Permiso asignado',
            message: `Se asigno el permiso ${permission.method} ${permission.url} al rol "${this.selectedRole?.name}".`
          });
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error asignando permiso';
          this.cdr.detectChanges();
        }
      });
    }
  }

  getMethodClass(method: string): string {
    const classes: Record<string, string> = {
      'GET': 'method-get',
      'POST': 'method-post',
      'PUT': 'method-put',
      'DELETE': 'method-delete',
      'PATCH': 'method-patch'
    };
    return classes[method.toUpperCase()] || 'method-default';
  }
}
