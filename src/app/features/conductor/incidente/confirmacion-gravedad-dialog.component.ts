import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmacionGravedadData {
  gravedad: 'ALTA' | 'CRITICA';
}

@Component({
  selector: 'app-confirmacion-gravedad-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon-wrap" [class.critica]="data.gravedad === 'CRITICA'">
        <mat-icon>{{ data.gravedad === 'CRITICA' ? 'emergency' : 'warning_amber' }}</mat-icon>
      </div>
      <div>
        <h2 mat-dialog-title>Confirmar reporte de gravedad {{ etiquetaGravedad }}</h2>
        <p class="dialog-sub">Esta acción notificará al equipo de supervisión</p>
      </div>
    </div>

    <mat-dialog-content class="dialog-body">
      <p>Estás a punto de reportar un incidente de gravedad <strong>{{ etiquetaGravedad }}</strong>.</p>
      <p>Esto activará una alerta inmediata para el equipo de soporte. ¿Deseas continuar?</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button [mat-dialog-close]="false">Revisar formulario</button>
      <button
        mat-flat-button
        [color]="data.gravedad === 'CRITICA' ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
        class="btn-confirmar"
      >
        <mat-icon>send</mat-icon>
        Sí, reportar ahora
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 24px 24px 0;
    }

    .dialog-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      background: rgba(255, 152, 0, 0.12);

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
        color: #fb8c00;
      }

      &.critica {
        background: rgba(244, 67, 54, 0.12);

        mat-icon { color: #f44336; }
      }
    }

    h2[mat-dialog-title] {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .dialog-sub {
      margin: 4px 0 0;
      font-size: 12px;
      opacity: 0.55;
    }

    .dialog-body {
      padding: 16px 24px 8px !important;

      p {
        margin: 0 0 10px;
        font-size: 14px;
        line-height: 1.6;
        opacity: 0.85;

        &:last-child { margin-bottom: 0; }

        strong { opacity: 1; }
      }
    }

    .dialog-actions {
      padding: 8px 24px 16px !important;
      gap: 8px;
    }

    .btn-confirmar {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `]
})
export class ConfirmacionGravedadDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionGravedadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmacionGravedadData
  ) {}

  get etiquetaGravedad(): string {
    return this.data.gravedad === 'CRITICA' ? 'Crítico' : 'Alto';
  }
}
