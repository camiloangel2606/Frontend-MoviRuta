import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Permission {
  id?: string;
  url: string;
  method: string;
  model: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private endpoint = '/permissions';

  constructor(private api: ApiService) {}

  getAll(): Observable<Permission[]> {
    return this.api.get<Permission[]>(this.endpoint);
  }

  getById(id: string): Observable<Permission> {
    return this.api.get<Permission>(`${this.endpoint}/${id}`);
  }

  create(permission: Permission): Observable<Permission> {
    return this.api.post<Permission>(this.endpoint, permission);
  }

  update(id: string, permission: Permission): Observable<Permission> {
    return this.api.put<Permission>(`${this.endpoint}/${id}`, permission);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
