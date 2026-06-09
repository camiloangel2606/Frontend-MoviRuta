import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-acceso-denegado',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="acceso-denegado">
      <mat-icon class="icon">lock</mat-icon>
      <h1>Acceso denegado</h1>
      <p>No tienes los permisos necesarios para ver esta sección.</p>
      <div class="actions">
        <button mat-flat-button color="primary" (click)="irAlDashboard()">
          <mat-icon>home</mat-icon>
          Volver al inicio
        </button>
      </div>
    </div>
  `,
  styles: [`
    .acceso-denegado {
      min-height: calc(100vh - 84px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      gap: 12px;
    }
    .icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: var(--color-primary, #1565C0);
      margin-bottom: 8px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary, #1d2939);
    }
    p {
      margin: 0;
      color: var(--text-secondary, #667085);
      max-width: 420px;
    }
    .actions {
      margin-top: 16px;
    }
  `]
})
export class AccesoDenegadoComponent {
  constructor(private router: Router) {}

  irAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
