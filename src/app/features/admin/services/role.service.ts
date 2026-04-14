import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface CreateRoleDto {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Role[]> {
    return this.api.get<Role[]>('/roles');
  }

  getById(id: string): Observable<Role> {
    return this.api.get<Role>(`/roles/${id}`);
  }

  create(role: CreateRoleDto): Observable<Role> {
    return this.api.post<Role>('/roles', role);
  }

  update(id: string, role: CreateRoleDto): Observable<Role> {
    return this.api.put<Role>(`/roles/${id}`, role);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/roles/${id}`);
  }
}
