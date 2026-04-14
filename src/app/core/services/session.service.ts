import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Session, LogoutResponse } from '../../shared/models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  getMySessions(): Observable<Session[]> {
    return this.api.get<Session[]>('/sessions/my-sessions');
  }

  logout(): Observable<LogoutResponse> {
    return this.api.delete<LogoutResponse>('/sessions/logout').pipe(
      tap(() => this.auth.logout())
    );
  }

  logoutAll(): Observable<LogoutResponse> {
    return this.api.delete<LogoutResponse>('/sessions/logout-all').pipe(
      tap(() => this.auth.logout())
    );
  }

  closeSession(sessionId: string): Observable<LogoutResponse> {
    return this.api.delete<LogoutResponse>(`/sessions/close/${sessionId}`);
  }

  isCurrentSession(session: Session): boolean {
    const currentToken = this.auth.getToken();
    return session.token === currentToken;
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
