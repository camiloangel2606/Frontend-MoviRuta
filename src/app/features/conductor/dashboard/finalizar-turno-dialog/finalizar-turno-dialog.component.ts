import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TurnoService, Turno } from '../../turno.service';

export interface FinalizarTurnoDialogData {
  turnoId: number;
  bus: string;
  inicioLabel: string;
}

@Component({
  selector: 'app-finalizar-turno-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon-wrap">
        <mat-icon>stop_circle</mat-icon>
      </div>
      <div>
        <h2 mat-dialog-title>Finalizar Turno</h2>
        <p class="dialog-sub">{{ data.bus }}</p>
      </div>
    </div>

    <mat-dialog-content class="dialog-body">
      <div class="aviso-card">
        <mat-icon class="aviso-icon">info_outline</mat-icon>
        <div class="aviso-texto">
          <strong>¿Seguro que deseas finalizar tu turno?</strong>
          <p>Esto registrará la hora exacta de cierre y cambiará el estado a <em>Finalizado</em>. Esta acción es irreversible.</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-fila">
          <mat-icon>directions_bus</mat-icon>
          <span>{{ data.bus }}</span>
        </div>
        <div class="resumen-fila">
          <mat-icon>play_arrow</mat-icon>
          <span>Inicio: {{ data.inicioLabel }}</span>
        </div>
        <div class="resumen-fila">
          <mat-icon>stop</mat-icon>
          <span>Fin: ahora ({{ horaActual }})</span>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close [disabled]="cargando">Cancelar</button>
      <button
        mat-flat-button
        color="warn"
        (click)="confirmar()"
        [disabled]="cargando"
        class="btn-confirmar"
      >
        <mat-progress-spinner
          *ngIf="cargando"
          diameter="18"
          mode="indeterminate"
          class="btn-spinner"
        ></mat-progress-spinner>
        <mat-icon *ngIf="!cargando">stop_circle</mat-icon>
        {{ cargando ? 'Finalizando...' : 'Sí, finalizar turno' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 0;
    }

    .dialog-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(244, 67, 54, 0.1);
      display: grid;
      place-items: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #e53935;
      }
    }

    h2[mat-dialog-title] {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .dialog-sub {
      margin: 2px 0 0;
      font-size: 13px;
      opacity: 0.55;
    }

    .dialog-body {
      padding: 20px 24px 8px !important;
    }

    .aviso-card {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(244, 67, 54, 0.06);
      border: 1px solid rgba(244, 67, 54, 0.18);
      margin-bottom: 16px;
    }

    .aviso-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: #e53935;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .aviso-texto {
      font-size: 14px;

      strong {
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
      }

      p {
        margin: 0;
        opacity: 0.75;
        font-size: 13px;
        line-height: 1.5;
      }

      em {
        font-style: normal;
        font-weight: 600;
        color: #e53935;
      }
    }

    .resumen {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .resumen-fila {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      opacity: 0.75;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        opacity: 0.6;
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

    .btn-spinner {
      display: inline-flex;
    }
  `],
})
export class FinalizarTurnoDialogComponent {
  cargando = false;
  readonly horaActual = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  constructor(
    private dialogRef: MatDialogRef<FinalizarTurnoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FinalizarTurnoDialogData,
    private turnoService: TurnoService,
  ) {}

  confirmar(): void {
    this.cargando = true;
    this.turnoService.finalizarTurno(this.data.turnoId).subscribe({
      next: (turno: Turno) => {
        this.dialogRef.close(turno);
      },
      error: () => {
        this.cargando = false;
      },
    });
  }
}
