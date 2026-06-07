import { Component, OnInit, OnDestroy, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BusService, Bus, Empresa, CrearBusDto, ActualizarBusDto } from '../../../services/bus.service';

export interface RegistrarBusDialogData {
  bus?: Bus;
}
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-registrar-bus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './registrar-bus-dialog.component.html',
  styleUrl: './registrar-bus-dialog.component.scss',
})
export class RegistrarBusDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;

  empresas: Empresa[] = [];
  isCargando = true;
  isGuardando = false;

  capacidadMaxima = 0;

  readonly anioActual = new Date().getFullYear();

  readonly opcionesEstado: { value: string; label: string }[] = [
    { value: 'OPERATIVO',       label: 'Operativo' },
    { value: 'MANTENIMIENTO',   label: 'Mantenimiento' },
    { value: 'FUERA_SERVICIO',  label: 'Fuera de servicio' },
  ];

  private destroy$ = new Subject<void>();

  get modoEdicion(): boolean {
    return !!this.data?.bus;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarBusDialogComponent>,
    private busService: BusService,
    private toast: ToastService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: RegistrarBusDialogData | null,
  ) {
    this.form = this.fb.group({
      placa:              ['', [Validators.required, Validators.maxLength(10)]],
      modelo:             ['', Validators.required],
      anio:               [
        this.anioActual,
        [Validators.required, Validators.min(1990), Validators.max(this.anioActual)],
      ],
      capacidadSentados:  [0, [Validators.required, Validators.min(0)]],
      capacidadParados:   [0, [Validators.required, Validators.min(0)]],
      estado:             ['OPERATIVO', Validators.required],
      empresaId:          [null as number | null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarEmpresas();
    this.escucharCapacidades();
  }

  private precargarFormulario(): void {
    const bus = this.data?.bus;
    if (!bus) return;
    this.form.patchValue({
      placa:             bus.placa,
      modelo:            bus.modelo,
      anio:              bus.anio,
      capacidadSentados: bus.capacidadMaxima,
      capacidadParados:  0,
      estado:            bus.estado,
      empresaId:         bus.empresa?.id ?? null,
    });
    this.recalcularCapacidad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarEmpresas(): void {
    this.busService.getEmpresas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        if (empresas.length === 1 && !this.modoEdicion) {
          this.form.get('empresaId')!.setValue(empresas[0].id);
        }
        this.precargarFormulario();
        this.isCargando = false;
      },
      error: () => {
        this.toast.error('Error al cargar empresas');
        this.isCargando = false;
      },
    });
  }

  private escucharCapacidades(): void {
    ['capacidadSentados', 'capacidadParados'].forEach(ctrl => {
      this.form.get(ctrl)!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.recalcularCapacidad();
      });
    });
  }

  private recalcularCapacidad(): void {
    const sentados = Number(this.form.get('capacidadSentados')!.value) || 0;
    const parados  = Number(this.form.get('capacidadParados')!.value) || 0;
    this.capacidadMaxima = sentados + parados;
  }

  onCancelar(): void {
    this.dialogRef.close(null);
  }

  onGuardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;
    const capacidad = this.capacidadMaxima > 0 ? this.capacidadMaxima : 1;
    this.isGuardando = true;

    if (this.modoEdicion) {
      const dto: ActualizarBusDto = {
        placa:           (raw.placa as string).trim().toUpperCase(),
        modelo:          (raw.modelo as string).trim(),
        anio:            raw.anio as number,
        capacidadMaxima: capacidad,
        empresaId:       raw.empresaId as number,
        estado:          raw.estado as 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO',
      };
      this.busService.actualizarBus(this.data!.bus!.id, dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: (bus) => { this.isGuardando = false; this.dialogRef.close(bus); },
        error: () => { this.isGuardando = false; this.toast.error('Error al actualizar el bus'); },
      });
    } else {
      const dto: CrearBusDto = {
        placa:           (raw.placa as string).trim().toUpperCase(),
        modelo:          (raw.modelo as string).trim(),
        anio:            raw.anio as number,
        capacidadMaxima: capacidad,
        empresaId:       raw.empresaId as number,
        estado:          raw.estado as 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO',
      };
      this.busService.crearBus(dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: (bus) => { this.isGuardando = false; this.dialogRef.close(bus); },
        error: () => { this.isGuardando = false; this.toast.error('Error al registrar el bus'); },
      });
    }
  }

  get placaCtrl()             { return this.form.get('placa')!; }
  get modeloCtrl()            { return this.form.get('modelo')!; }
  get anioCtrl()              { return this.form.get('anio')!; }
  get capacidadSentadosCtrl() { return this.form.get('capacidadSentados')!; }
  get capacidadParadosCtrl()  { return this.form.get('capacidadParados')!; }
  get estadoCtrl()            { return this.form.get('estado')!; }
  get empresaIdCtrl()         { return this.form.get('empresaId')!; }

  get puedeGuardar(): boolean {
    return !this.isGuardando && !this.isCargando;
  }
}
