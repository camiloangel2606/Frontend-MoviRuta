import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Permission } from './permission.service';

export interface Role {
  id?: string;
  name: string;
  description?: string;
}

export interface RolePermission {
  id?: string;
  role?: Role;
  permission?: Permission;
}

@Injectable({
  providedIn: 'root'
})
export class RolePermissionService {
  private endpoint = '/role-permissions';

  constructor(private api: ApiService) {}

  getAll(): Observable<RolePermission[]> {
    return this.api.get<RolePermission[]>(this.endpoint);
  }

  getByRole(roleId: string): Observable<RolePermission[]> {
    return this.api.get<RolePermission[]>(`${this.endpoint}/role/${roleId}`);
  }

  assign(roleId: string, permissionId: string): Observable<RolePermission> {
    // Enviar como body JSON en lugar de path params
    return this.api.post<RolePermission>(this.endpoint, {
      role: { id: roleId },
      permission: { id: permissionId }
    });
  }

  remove(rolePermissionId: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${rolePermissionId}`);
  }
}
