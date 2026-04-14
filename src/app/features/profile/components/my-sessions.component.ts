import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { Session } from '../../../shared/models/session.model';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-my-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-sessions.component.html',
  styleUrls: ['./my-sessions.component.scss']
})
export class MySessionsComponent implements OnInit {
  sessions: Session[] = [];
  loading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  closingSessionId: string | null = null;
  closingAll = false;

  constructor(
    private sessionService: SessionService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.errorMessage = null;

    this.sessionService.getMySessions().subscribe({
      next: sessions => {
        this.sessions = sessions;
        this.loading = false;
      },
      error: err => {
        SecurityLogger.warn('Session', 'No se pudieron cargar las sesiones activas', err);
        this.errorMessage = 'Error al cargar las sesiones';
        this.loading = false;

        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  isCurrentSession(session: Session): boolean {
    return this.sessionService.isCurrentSession(session);
  }

  getTimeRemaining(session: Session): string {
    return this.sessionService.getTimeRemaining(session);
  }

  formatExpiration(session: Session): string {
    const date = new Date(session.expiration);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  closeSession(session: Session): void {
    if (this.isCurrentSession(session)) {
      this.logoutCurrent();
      return;
    }

    const confirmed = confirm(
      'Estas seguro de cerrar esta sesion?\n\n' +
      'El dispositivo asociado perdera acceso inmediatamente.'
    );

    if (!confirmed) return;

    this.closingSessionId = session.id;
    this.errorMessage = null;
    this.successMessage = null;

    this.sessionService.closeSession(session.id).subscribe({
      next: () => {
        this.successMessage = 'Sesion cerrada exitosamente';
        this.closingSessionId = null;
        this.loadSessions();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: err => {
        SecurityLogger.warn('Session', 'No se pudo cerrar una sesion remota', err);
        this.errorMessage = err.error?.error || 'Error al cerrar la sesion';
        this.closingSessionId = null;
      }
    });
  }

  logoutCurrent(): void {
    const confirmed = confirm(
      'Cerrar tu sesion actual?\n\n' +
      'Seras redirigido al login.'
    );

    if (!confirmed) return;

    this.sessionService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  logoutAll(): void {
    const confirmed = confirm(
      'ATENCION\n\n' +
      'Cerrar sesion en TODOS tus dispositivos?\n\n' +
      'Esta accion cerrara esta sesion y cualquier otra sesion activa.'
    );

    if (!confirmed) return;

    this.closingAll = true;
    this.errorMessage = null;

    this.sessionService.logoutAll().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: err => {
        SecurityLogger.warn('Session', 'No se pudo cerrar la totalidad de sesiones desde el servidor', err);
        this.closingAll = false;
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
