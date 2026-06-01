import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { TurnoService, Bus, Turno } from '../../turno.service';

export interface CrearTurnoDialogData {
  conductorId: number;
  busIdSugerido?: number;
  busNombreSugerido?: string;
  /** Fecha sugerida desde la programación (Date objeto local) */
  fechaSugerida?: Date;
  /** Hora sugerida desde la programación — formato "HH:mm" */
  horaSugerida?: string;
}

@Component({
  selector: 'app-crear-turno-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon-wrap">
        <mat-icon>add_circle_outline</mat-icon>
      </div>
      <div>
        <h2 mat-dialog-title>Crear Turno</h2>
        <p class="dialog-sub">Registra un nuevo turno de trabajo</p>
      </div>
    </div>

    <mat-dialog-content class="dialog-body">
      @if (isCargando) {
        <div class="cargando-center">
          <mat-spinner diameter="36"></mat-spinner>
          <p>Cargando buses...</p>
        </div>
      } @else {
        <form [formGroup]="form" class="crear-form">

          <!-- Bus -->
          <mat-form-field appearance="outline" class="campo-full">
            <mat-label>Bus a operar</mat-label>
            <mat-select formControlName="busId">
              @for (b of buses; track b.id) {
                <mat-option [value]="b.id">{{ b.placa }} — {{ b.modelo }}</mat-option>
              }
            </mat-select>
            <mat-icon matSuffix>directions_bus</mat-icon>
            @if (form.get('busId')!.hasError('required') && form.get('busId')!.touched) {
              <mat-error>Selecciona el bus que vas a operar</mat-error>
            }
          </mat-form-field>

          @if (data.busIdSugerido) {
            <p class="sugerencia-hint">
              <mat-icon>info_outline</mat-icon>
              Tu programación de hoy indica el bus pre-seleccionado.
            </p>
          }

          <mat-divider class="divisor"></mat-divider>

          <!-- Fecha + Hora -->
          <div class="campos-fila">
            <mat-form-field appearance="outline" class="campo-mitad">
              <mat-label>Fecha de inicio</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="fecha" readonly>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              @if (form.get('fecha')!.hasError('required') && form.get('fecha')!.touched) {
                <mat-error>La fecha es obligatoria</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="campo-mitad">
              <mat-label>Hora de inicio</mat-label>
              <input matInput type="time" formControlName="hora">
              <mat-icon matSuffix>schedule</mat-icon>
              @if (form.get('hora')!.hasError('required') && form.get('hora')!.touched) {
                <mat-error>La hora es obligatoria</mat-error>
              }
            </mat-form-field>
          </div>

          <!-- Observaciones -->
          <mat-form-field appearance="outline" class="campo-full">
            <mat-label>Observaciones (opcional)</mat-label>
            <textarea
              matInput
              formControlName="observaciones"
              rows="3"
              maxlength="255"
              placeholder="Estado del vehículo, novedades..."
            ></textarea>
            <mat-hint align="end">{{ form.get('observaciones')!.value?.length || 0 }}/255</mat-hint>
          </mat-form-field>

        </form>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close [disabled]="isGuardando">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        (click)="confirmar()"
        [disabled]="isGuardando || isCargando"
        class="btn-confirmar"
      >
        <mat-progress-spinner
          *ngIf="isGuardando"
          diameter="18"
          mode="indeterminate"
          class="btn-spinner"
        ></mat-progress-spinner>
        <mat-icon *ngIf="!isGuardando">add_circle</mat-icon>
        {{ isGuardando ? 'Creando...' : 'Crear Turno' }}
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
      background: rgba(23, 117, 255, 0.1);
      display: grid;
      place-items: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #1775ff;
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
      padding: 16px 24px 8px !important;
      overflow-y: auto;
      max-height: calc(100vh - 220px);
    }

    .cargando-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 0;
      font-size: 14px;
      opacity: 0.6;
    }

    .crear-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }

    .campo-full { width: 100%; }
    .campo-mitad { flex: 1; min-width: 120px; }

    .campos-fila {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .divisor { margin: 4px 0 12px; }

    .sugerencia-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #1775ff;
      margin: -8px 0 4px;
      opacity: 0.8;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
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

    .btn-spinner { display: inline-flex; }
  `],
})
export class CrearTurnoDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  buses: Bus[] = [];
  isCargando = true;
  isGuardando = false;

  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CrearTurnoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CrearTurnoDialogData,
    private turnoService: TurnoService,
  ) {}

  ngOnInit(): void {
    const now = new Date();
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.form = this.fb.group({
      busId:         [this.data.busIdSugerido ?? null, Validators.required],
      fecha:         [this.data.fechaSugerida ?? now, Validators.required],
      hora:          [this.data.horaSugerida  ?? horaActual, Validators.required],
      observaciones: [''],
    });

    const sub = this.turnoService.getBuses().subscribe({
      next: (buses) => {
        this.buses = buses.filter(b => b.estado === 'OPERATIVO');
        this.isCargando = false;
      },
      error: () => {
        this.isCargando = false;
      },
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  confirmar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;
    const inicio = this.buildISOInicio(raw.fecha as Date, raw.hora as string);
    const obs = (raw.observaciones as string)?.trim() || undefined;

    const dto = {
      conductorId: this.data.conductorId,
      busId:       raw.busId as number,
      inicio,
      ...(obs ? { observaciones: obs } : {}),
    };

    this.isGuardando = true;
    const sub = this.turnoService.crearTurno(dto).subscribe({
      next: (turno: Turno) => {
        this.dialogRef.close(turno);
      },
      error: () => {
        this.isGuardando = false;
      },
    });
    this.subs.push(sub);
  }

  private buildISOInicio(fecha: Date, hora: string): string {
    const d = new Date(fecha);
    const [h, m] = hora.split(':').map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d.toISOString();
  }
}
