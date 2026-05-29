import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { TurnoService, Turno } from '../../turno.service';

export interface IniciarTurnoDialogData {
  turnoId: number;
  bus: string;
}

@Component({
  selector: 'app-iniciar-turno-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <mat-icon class="dialog-icon">play_circle</mat-icon>
      <div>
        <h2 mat-dialog-title>Iniciar Turno</h2>
        <p class="dialog-sub">{{ data.bus }}</p>
      </div>
    </div>

    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <p class="instruccion">Selecciona el estado de inicio del turno:</p>

      <mat-radio-group formControlName="modo" class="radio-group">
        <mat-radio-button value="operativo" class="radio-item">
          <div class="radio-label">
            <mat-icon>check_circle_outline</mat-icon>
            <span>Operativo</span>
          </div>
          <p class="radio-desc">El vehículo está en condiciones óptimas para operar.</p>
        </mat-radio-button>

        <mat-radio-button value="con_observaciones" class="radio-item">
          <div class="radio-label">
            <mat-icon>info_outline</mat-icon>
            <span>Con observaciones</span>
          </div>
          <p class="radio-desc">Existen situaciones a reportar antes de iniciar.</p>
        </mat-radio-button>
      </mat-radio-group>

      <mat-form-field *ngIf="mostrarObservaciones" appearance="outline" class="obs-field">
        <mat-label>Observaciones</mat-label>
        <textarea
          matInput
          formControlName="observaciones"
          rows="3"
          placeholder="Describe las novedades o situaciones a reportar..."
          maxlength="500"
        ></textarea>
        <mat-hint align="end">{{ form.get('observaciones')?.value?.length || 0 }}/500</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close [disabled]="cargando">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
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
        <mat-icon *ngIf="!cargando">play_arrow</mat-icon>
        {{ cargando ? 'Iniciando...' : 'Confirmar Inicio' }}
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

    .dialog-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--app-support, #1775ff);
    }

    h2[mat-dialog-title] {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .dialog-sub {
      margin: 2px 0 0;
      font-size: 13px;
      opacity: 0.6;
    }

    .dialog-body {
      padding: 16px 24px 8px !important;
      max-height: 420px;
    }

    .instruccion {
      font-size: 14px;
      opacity: 0.7;
      margin: 0 0 16px;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .radio-item {
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 12px;
      padding: 12px 16px;
      transition: border-color 0.2s, background 0.2s;

      &:hover {
        border-color: var(--app-support, #1775ff);
        background: rgba(23, 117, 255, 0.04);
      }
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--app-support, #1775ff);
      }
    }

    .radio-desc {
      margin: 4px 0 0 26px;
      font-size: 12px;
      opacity: 0.6;
    }

    .obs-field {
      width: 100%;
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
  `]
})
export class IniciarTurnoDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  mostrarObservaciones = false;
  cargando = false;
  private modoSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<IniciarTurnoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IniciarTurnoDialogData,
    private turnoService: TurnoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      modo: ['operativo'],
      observaciones: ['']
    });

    this.modoSub = this.form.get('modo')!.valueChanges.subscribe(valor => {
      this.mostrarObservaciones = valor === 'con_observaciones';
      if (!this.mostrarObservaciones) {
        this.form.get('observaciones')!.setValue('');
      }
    });
  }

  ngOnDestroy(): void {
    this.modoSub?.unsubscribe();
  }

  confirmar(): void {
    this.cargando = true;
    const obs = this.mostrarObservaciones
      ? (this.form.get('observaciones')!.value as string)?.trim()
      : undefined;

    const dto: { observaciones?: string } = obs ? { observaciones: obs } : {};

    this.turnoService.iniciarTurno(this.data.turnoId, dto).subscribe({
      next: (turnoActualizado: Turno) => {
        this.dialogRef.close(turnoActualizado);
      },
      error: () => {
        this.cargando = false;
      }
    });
  }
}
