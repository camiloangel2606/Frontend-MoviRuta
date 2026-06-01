import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ProgramacionService, Programacion, EstadoProgramacion
} from '../../services/programacion.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NuevaProgramacionDialogComponent } from './nueva-programacion-dialog/nueva-programacion-dialog.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

@Component({
  selector: 'app-programaciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './programaciones.component.html',
  styleUrl: './programaciones.component.scss',
})
export class ProgramacionesComponent implements OnInit, OnDestroy {
  readonly columnas = ['ruta', 'bus', 'fecha', 'horaSalida', 'estado', 'recurrencia'];

  readonly opcionesEstado: { value: EstadoProgramacion | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PROGRAMADO', label: 'Programado' },
    { value: 'EN_CURSO', label: 'En curso' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'CANCELADO', label: 'Cancelado' },
  ];

  todasLasProgramaciones: Programacion[] = [];
  programacionesFiltradas: Programacion[] = [];
  isLoading = true;

  filtroEstadoCtrl = new FormControl<EstadoProgramacion | ''>('');

  private destroy$ = new Subject<void>();

  constructor(
    private programacionService: ProgramacionService,
    private toast: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarProgramaciones();
    this.filtroEstadoCtrl.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(estado => this.filtrar(estado ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarProgramaciones(): void {
    this.isLoading = true;
    this.programacionService.getProgramaciones().pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (progs) => {
        this.todasLasProgramaciones = Array.isArray(progs) ? progs : (progs as any).data ?? [];
        this.filtrar(this.filtroEstadoCtrl.value ?? '');
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private filtrar(estado: EstadoProgramacion | ''): void {
    this.programacionesFiltradas = estado
      ? this.todasLasProgramaciones.filter(p => p.estado === estado)
      : [...this.todasLasProgramaciones];
  }

  abrirDialogoNuevaProgramacion(): void {
    const ref = this.dialog.open(NuevaProgramacionDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((prog: Programacion | null) => {
      if (prog) {
        const codigo = this.formatCodigo(prog.id);
        this.toast.success(`Programación creada. Código: ${codigo}`);
        this.cargarProgramaciones();
      }
    });
  }

  formatCodigo(id: number): string {
    return `PRG-${id.toString().padStart(4, '0')}`;
  }

  estadoLabel(estado: EstadoProgramacion): string {
    const etiquetas: Record<EstadoProgramacion, string> = {
      PROGRAMADO: 'Programado',
      EN_CURSO: 'En curso',
      FINALIZADO: 'Finalizado',
      CANCELADO: 'Cancelado',
    };
    return etiquetas[estado] ?? estado;
  }

  recurrenciaLabel(r: string): string {
    const etiquetas: Record<string, string> = {
      UNICA: 'Única',
      DIARIA: 'Diaria',
      LUNES_A_VIERNES: 'Lun–Vie',
      FINES_DE_SEMANA: 'Fin de semana',
    };
    return etiquetas[r] ?? r;
  }

  get totalProgramaciones(): number {
    return this.todasLasProgramaciones.length;
  }

  get totalProgramadas(): number {
    return this.todasLasProgramaciones.filter(p => p.estado === 'PROGRAMADO').length;
  }

  get totalEnCurso(): number {
    return this.todasLasProgramaciones.filter(p => p.estado === 'EN_CURSO').length;
  }
}
