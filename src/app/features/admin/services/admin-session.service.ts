import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Session } from '../../../shared/models/session.model';

@Injectable({
  providedIn: 'root'
})
export class AdminSessionService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Session[]> {
    return this.api.get<Session[]>('/sessions');
  }

  getById(id: string): Observable<Session> {
    return this.api.get<Session>(`/sessions/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/sessions/${id}`);
  }

  isExpired(session: Session): boolean {
    const expiration = new Date(session.expiration);
    return expiration.getTime() < Date.now();
  }

  getTimeRemaining(session: Session): string {
    const expiration = new Date(session.expiration);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expirada';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }

    return `${diffMins}m`;
  }
}
