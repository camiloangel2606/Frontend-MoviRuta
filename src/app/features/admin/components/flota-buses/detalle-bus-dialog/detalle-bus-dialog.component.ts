import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BusService, Bus } from '../../../services/bus.service';
import { ToastService } from '../../../../../core/services/toast.service';

export interface DetalleBusDialogData {
  bus: Bus;
}

export interface DetalleBusDialogResult {
  action: 'edit' | 'deleted';
  bus: Bus;
}

@Component({
  selector: 'app-detalle-bus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    QRCodeComponent,
  ],
  templateUrl: './detalle-bus-dialog.component.html',
  styleUrl: './detalle-bus-dialog.component.scss',
})
export class DetalleBusDialogComponent implements OnDestroy {
  bus: Bus;
  nuevoEstado: 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

  isGuardandoEstado = false;
  isEliminando = false;
  confirmandoEliminar = false;

  readonly opcionesEstado = [
    { value: 'OPERATIVO',      label: 'Operativo' },
    { value: 'MANTENIMIENTO',  label: 'Mantenimiento' },
    { value: 'FUERA_SERVICIO', label: 'Fuera de servicio' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) data: DetalleBusDialogData,
    private dialogRef: MatDialogRef<DetalleBusDialogComponent, DetalleBusDialogResult | null>,
    private busService: BusService,
    private toast: ToastService,
  ) {
    this.bus = { ...data.bus };
    this.nuevoEstado = this.bus.estado;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get qrData(): string {
    return `BUS-${this.bus.id}:${this.bus.placa}`;
  }

  get codigoBus(): string {
    return `BUS-${this.bus.id.toString().padStart(4, '0')}`;
  }

  get estadoCambiado(): boolean {
    return this.nuevoEstado !== this.bus.estado;
  }

  guardarEstado(): void {
    if (!this.estadoCambiado) return;
    this.isGuardandoEstado = true;
    this.busService.actualizarBus(this.bus.id, { estado: this.nuevoEstado })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (busActualizado) => {
          this.bus = { ...busActualizado };
          this.nuevoEstado = busActualizado.estado;
          this.isGuardandoEstado = false;
          this.toast.success('Estado actualizado');
        },
        error: () => {
          this.isGuardandoEstado = false;
          this.toast.error('Error al actualizar el estado');
        },
      });
  }

  onEditar(): void {
    this.dialogRef.close({ action: 'edit', bus: this.bus });
  }

  onSolicitarEliminar(): void {
    this.confirmandoEliminar = true;
  }

  onCancelarEliminar(): void {
    this.confirmandoEliminar = false;
  }

  onConfirmarEliminar(): void {
    this.isEliminando = true;
    this.busService.eliminarBus(this.bus.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.dialogRef.close({ action: 'deleted', bus: this.bus });
        },
        error: () => {
          this.isEliminando = false;
          this.confirmandoEliminar = false;
          this.toast.error('No se puede eliminar — el bus tiene registros asociados');
        },
      });
  }

  onCerrar(): void {
    this.dialogRef.close(null);
  }

  estadoLabel(estado: string): string {
    const etiquetas: Record<string, string> = {
      OPERATIVO:      'Operativo',
      MANTENIMIENTO:  'Mantenimiento',
      FUERA_SERVICIO: 'Fuera de servicio',
    };
    return etiquetas[estado] ?? estado;
  }
}
