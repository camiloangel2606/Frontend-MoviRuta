import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSessionService } from '../admin/services/admin-session.service';
import { Session } from '../../shared/models/session.model';
import { SecurityLogger } from '../../core/utils/security-logger';

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss']
})
export class SessionListComponent implements OnInit {
  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  deletingId: string | null = null;
  successMessage: string | null = null;

  constructor(private sessionService: AdminSessionService) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.error = null;

    this.sessionService.getAll().subscribe({
      next: sessions => {
        this.sessions = sessions;
        this.filteredSessions = sessions;
        this.loading = false;
      },
      error: err => {
        this.error = 'Error al cargar las sesiones. Verifica tus permisos.';
        this.loading = false;
        SecurityLogger.warn('Admin', 'No se pudieron cargar las sesiones globales del sistema', err);
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredSessions = this.sessions;
      return;
    }

    this.filteredSessions = this.sessions.filter(session =>
      session.user.name.toLowerCase().includes(term) ||
      session.user.email.toLowerCase().includes(term)
    );
  }

  deleteSession(session: Session): void {
    const userName = session.user.name || session.user.email || 'Usuario';
    const confirmed = confirm(
      `Cerrar la sesion de "${userName}"?\n\n` +
      'Esta accion forzara al usuario a volver a iniciar sesion.'
    );

    if (!confirmed) return;

    this.deletingId = session.id;
    this.error = null;
    this.successMessage = null;

    this.sessionService.delete(session.id).subscribe({
      next: () => {
        this.successMessage = `Sesion de ${userName} cerrada exitosamente`;
        this.deletingId = null;
        this.loadSessions();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: err => {
        this.error = 'Error al cerrar la sesion';
        this.deletingId = null;
        SecurityLogger.warn('Admin', 'No se pudo cerrar una sesion desde el panel admin', err);
      }
    });
  }

  isExpired(session: Session): boolean {
    return this.sessionService.isExpired(session);
  }

  getTimeRemaining(session: Session): string {
    return this.sessionService.getTimeRemaining(session);
  }

  formatExpiration(session: Session): string {
    const date = new Date(session.expiration);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getProviderIcon(provider: string | undefined): string {
    switch (provider?.toUpperCase()) {
      case 'GOOGLE': return 'Google';
      case 'GITHUB': return 'GitHub';
      case 'MICROSOFT': return 'Microsoft';
      default: return 'Local';
    }
  }

  getActiveCount(): number {
    return this.sessions.filter(s => !this.isExpired(s)).length;
  }

  getExpiredCount(): number {
    return this.sessions.filter(s => this.isExpired(s)).length;
  }
}
