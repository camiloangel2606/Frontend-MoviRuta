import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, Subscription } from 'rxjs';
import { RutaService, Ruta } from '../../services/ruta.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NuevaRutaDialogComponent } from './nueva-ruta-dialog/nueva-ruta-dialog.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

@Component({
  selector: 'app-gestion-rutas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './gestion-rutas.component.html',
  styleUrl: './gestion-rutas.component.scss',
})
export class GestionRutasComponent implements OnInit, OnDestroy {
  readonly columnas = ['nombre', 'codigo', 'tarifa', 'paraderos'];

  rutas: Ruta[] = [];
  paraderoCounts: Record<number, number> = {};
  isLoading = true;
  isLoadingCounts = false;

  private subs: Subscription[] = [];

  constructor(
    private rutaService: RutaService,
    private toast: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private cargarRutas(): void {
    this.isLoading = true;
    const sub = this.rutaService.getRutas().subscribe({
      next: (rutas) => {
        this.rutas = rutas;
        this.isLoading = false;
        if (rutas.length > 0) {
          this.cargarParaderoCounts(rutas);
        }
      },
      error: () => {
        this.isLoading = false;
      },
    });
    this.subs.push(sub);
  }

  private cargarParaderoCounts(rutas: Ruta[]): void {
    this.isLoadingCounts = true;
    const requests = rutas.map(r => this.rutaService.getParaderosDeRuta(r.id));
    const sub = forkJoin(requests).subscribe({
      next: (resultados) => {
        const counts: Record<number, number> = {};
        resultados.forEach((paraderos, i) => {
          counts[rutas[i].id] = Array.isArray(paraderos) ? paraderos.length : 0;
        });
        this.paraderoCounts = counts;
        this.isLoadingCounts = false;
      },
      error: () => {
        this.isLoadingCounts = false;
      },
    });
    this.subs.push(sub);
  }

  abrirDialogoNuevaRuta(): void {
    const ref = this.dialog.open(NuevaRutaDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
      data: {},
    });

    const sub = ref.afterClosed().subscribe((ruta: Ruta | null) => {
      if (ruta) {
        const codigo = this.formatCodigo(ruta.id);
        this.toast.success(`Ruta "${ruta.nombre}" creada. Código: ${codigo}`);
        this.cargarRutas();
      }
    });
    this.subs.push(sub);
  }

  formatCodigo(id: number): string {
    return `RUT-${id.toString().padStart(4, '0')}`;
  }

  formatTarifa(valor: number): string {
    return `$${Number(valor).toLocaleString('es-CO')}`;
  }

  get promTarifa(): number {
    if (!this.rutas.length) return 0;
    return this.rutas.reduce((s, r) => s + Number(r.tarifa), 0) / this.rutas.length;
  }

  conteoParaderos(rutaId: number): string {
    if (this.isLoadingCounts && this.paraderoCounts[rutaId] === undefined) return '...';
    return String(this.paraderoCounts[rutaId] ?? '—');
  }
}
