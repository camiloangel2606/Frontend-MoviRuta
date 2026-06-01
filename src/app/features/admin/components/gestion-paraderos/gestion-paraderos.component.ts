import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ParaderoService, Paradero } from '../../services/paradero.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NuevoParaderoDialogComponent } from './nuevo-paradero-dialog/nuevo-paradero-dialog.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

@Component({
  selector: 'app-gestion-paraderos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './gestion-paraderos.component.html',
  styleUrl: './gestion-paraderos.component.scss',
})
export class GestionParaderosComponent implements OnInit, OnDestroy {
  readonly columnas = ['nombre', 'codigo', 'tipo', 'latitud', 'longitud'];

  todosLosParaderos: Paradero[] = [];
  paraderosFiltrados: Paradero[] = [];
  isLoading = true;
  buscadorCtrl = new FormControl('');

  private destroy$ = new Subject<void>();

  constructor(
    private paraderoService: ParaderoService,
    private toast: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarParaderos();
    this.buscadorCtrl.valueChanges.pipe(
      debounceTime(200),
      takeUntil(this.destroy$),
    ).subscribe(termino => this.filtrar(termino ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarParaderos(): void {
    this.isLoading = true;
    this.paraderoService.getParaderos().subscribe({
      next: (paraderos) => {
        this.todosLosParaderos = paraderos;
        this.paraderosFiltrados = paraderos;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private filtrar(termino: string): void {
    const q = termino.toLowerCase().trim();
    this.paraderosFiltrados = q
      ? this.todosLosParaderos.filter(p =>
          p.nombre.toLowerCase().includes(q) || p.tipo.toLowerCase().includes(q),
        )
      : this.todosLosParaderos;
  }

  abrirDialogoNuevoParadero(): void {
    const ref = this.dialog.open(NuevoParaderoDialogComponent, {
      width: '780px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((paradero: Paradero | null) => {
      if (paradero) {
        const codigo = this.formatCodigo(paradero.id);
        this.toast.success(`Paradero "${paradero.nombre}" creado. Código: ${codigo}`);
        this.cargarParaderos();
      }
    });
  }

  formatCodigo(id: number): string {
    return `PAR-${id.toString().padStart(4, '0')}`;
  }

  get totalParaderos(): number {
    return this.todosLosParaderos.length;
  }

  get conteoTerminales(): number {
    return this.todosLosParaderos.filter(p => p.tipo === 'TERMINAL').length;
  }
}
