import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Role } from './role.service';

export interface UserRole {
  id: string;
  user: { id: string; name: string; email: string };
  role: { id: string; name: string };
}

export interface UserWithRoles {
  user: { id: string; name: string; email: string };
  roles: Role[];
}

@Injectable({
  providedIn: 'root'
})
export class UserRoleService {
  constructor(private api: ApiService) {}

  getAll(): Observable<UserRole[]> {
    return this.api.get<UserRole[]>('/user-role');
  }

  getRolesByUser(userId: string): Observable<Role[]> {
    return this.api.get<Role[]>(`/user-role/user/${userId}`);
  }

  assignRole(userId: string, roleId: string): Observable<UserRole> {
    return this.api.post<UserRole>(`/user-role/user/${userId}/role/${roleId}`, {});
  }

  removeRole(userRoleId: string): Observable<void> {
    return this.api.delete<void>(`/user-role/${userRoleId}`);
  }
}
