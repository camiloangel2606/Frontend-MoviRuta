import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) {}

  getAll(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  getById(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }
}
