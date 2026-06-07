import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BusService, Bus } from '../../services/bus.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RegistrarBusDialogComponent } from './registrar-bus-dialog/registrar-bus-dialog.component';
import {
  DetalleBusDialogComponent,
  DetalleBusDialogResult,
} from './detalle-bus-dialog/detalle-bus-dialog.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

@Component({
  selector: 'app-flota-buses',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './flota-buses.component.html',
  styleUrl: './flota-buses.component.scss',
})
export class FlotaBusesComponent implements OnInit, OnDestroy {
  readonly columnas = ['placa', 'modelo', 'anio', 'capacidad', 'estado', 'acciones'];

  buses: Bus[] = [];
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private busService: BusService,
    private toast: ToastService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarBuses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarBuses(): void {
    this.isLoading = true;
    this.busService.getBuses().pipe(takeUntil(this.destroy$)).subscribe({
      next: (buses) => {
        this.buses = Array.isArray(buses) ? buses : (buses as any).data ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  abrirDialogoRegistrar(): void {
    const ref = this.dialog.open(RegistrarBusDialogComponent, {
      width: '580px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((bus: Bus | null) => {
      if (bus) {
        this.toast.success(`Bus "${bus.placa}" registrado exitosamente`);
        this.cargarBuses();
        this.abrirDetalle(bus);
      }
    });
  }

  onFilaClick(bus: Bus): void {
    this.abrirDetalle(bus);
  }

  private abrirDetalle(bus: Bus): void {
    const ref = this.dialog.open(DetalleBusDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      data: { bus },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(
      (resultado: DetalleBusDialogResult | null | undefined) => {
        if (!resultado) return;
        if (resultado.action === 'edit') {
          this.abrirDialogoEditar(resultado.bus);
        } else if (resultado.action === 'deleted') {
          this.toast.success(`Bus "${resultado.bus.placa}" eliminado`);
          this.cargarBuses();
        }
      },
    );
  }

  private abrirDialogoEditar(bus: Bus): void {
    const ref = this.dialog.open(RegistrarBusDialogComponent, {
      width: '580px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
      data: { bus },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((busActualizado: Bus | null) => {
      if (busActualizado) {
        this.toast.success(`Bus "${busActualizado.placa}" actualizado`);
        this.cargarBuses();
      }
    });
  }

  verIncidentes(bus: Bus, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/admin/buses', bus.id, 'incidentes']);
  }

  estadoLabel(estado: string): string {
    const etiquetas: Record<string, string> = {
      OPERATIVO:       'Operativo',
      MANTENIMIENTO:   'Mantenimiento',
      FUERA_SERVICIO:  'Fuera de servicio',
    };
    return etiquetas[estado] ?? estado;
  }

  estadoColor(estado: string): string {
    const colores: Record<string, string> = {
      OPERATIVO:      'primary',
      MANTENIMIENTO:  'warn',
      FUERA_SERVICIO: '',
    };
    return colores[estado] ?? '';
  }

  formatCodigo(id: number): string {
    return `BUS-${id.toString().padStart(4, '0')}`;
  }

  get totalOperativos(): number {
    return this.buses.filter(b => b.estado === 'OPERATIVO').length;
  }

  get totalMantenimiento(): number {
    return this.buses.filter(b => b.estado === 'MANTENIMIENTO').length;
  }

  get totalFueraServicio(): number {
    return this.buses.filter(b => b.estado === 'FUERA_SERVICIO').length;
  }
}
