import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import {
  ProgramacionService, Bus, Conductor, RecurrenciaEnum
} from '../../../services/programacion.service';
import { RutaService, Ruta } from '../../../services/ruta.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-nueva-programacion-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './nueva-programacion-dialog.component.html',
  styleUrl: './nueva-programacion-dialog.component.scss',
})
export class NuevaProgramacionDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;

  rutas: Ruta[] = [];
  buses: Bus[] = [];
  conductores: Conductor[] = [];

  esRecurrente = false;
  isCargando = true;
  isGuardando = false;

  verificandoBus = false;
  hayConflictoBus = false;

  verificandoConductor = false;
  hayConflictoConductor = false;

  readonly opcionesRecurrencia = [
    { value: 'DIARIA',           label: 'Diaria' },
    { value: 'LUNES_A_VIERNES',  label: 'Lunes a viernes' },
    { value: 'FINES_DE_SEMANA',  label: 'Fines de semana' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NuevaProgramacionDialogComponent>,
    private programacionService: ProgramacionService,
    private rutaService: RutaService,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      rutaId:            [null as number | null, Validators.required],
      busId:             [null as number | null, Validators.required],
      conductorId:       [null as number | null, Validators.required],
      fecha:             [null as Date | null,   Validators.required],
      horaSalida:        ['',                    Validators.required],
      toleranciaMinutos: [5, [Validators.required, Validators.min(0)]],
      tipoRecurrencia:   ['DIARIA'],
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.escucharCambios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatos(): void {
    forkJoin({
      rutas:       this.rutaService.getRutas(),
      buses:       this.programacionService.getBuses(),
      conductores: this.programacionService.getConductores(),
    }).subscribe({
      next: ({ rutas, buses, conductores }) => {
        this.rutas = rutas;
        this.buses = buses.filter(b => b.estado === 'OPERATIVO');
        this.conductores = conductores;
        this.isCargando = false;
      },
      error: () => {
        this.toast.error('Error al cargar datos del formulario');
        this.isCargando = false;
      },
    });
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  private escucharCambios(): void {
    // Bus conflict: bus, fecha, horaSalida, tolerancia
    ['busId', 'fecha', 'horaSalida', 'toleranciaMinutos'].forEach(c => {
      this.form.get(c)!.valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$))
        .subscribe(() => this.verificarBus());
    });

    // Conductor conflict: conductorId, fecha, horaSalida, tolerancia
    ['conductorId', 'fecha', 'horaSalida', 'toleranciaMinutos'].forEach(c => {
      this.form.get(c)!.valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$))
        .subscribe(() => this.verificarConductor());
    });
  }

  // ─── Validación bus ───────────────────────────────────────────────────────

  private verificarBus(): void {
    const busId = this.form.get('busId')!.value as number | null;
    const fecha = this.form.get('fecha')!.value as Date | null;

    if (!busId || !fecha) {
      this.hayConflictoBus = false;
      this.quitarError(this.form.get('busId')!, 'conflicto');
      return;
    }

    const fechaStr   = this.formatFecha(fecha);
    const horaSalida = this.form.get('horaSalida')!.value as string;
    const tolerancia = (this.form.get('toleranciaMinutos')!.value as number) ?? 5;

    this.verificandoBus = true;
    this.programacionService.getProgramacionesByBusYFecha(busId, fechaStr).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (progs) => {
        const conflicto = this.tieneConflictoHorario(progs, horaSalida, tolerancia);
        this.hayConflictoBus = conflicto;
        const ctrl = this.form.get('busId')!;
        if (conflicto) ctrl.setErrors({ ...ctrl.errors, conflicto: true });
        else           this.quitarError(ctrl, 'conflicto');
        this.verificandoBus = false;
      },
      error: () => { this.verificandoBus = false; },
    });
  }

  // ─── Validación conductor ─────────────────────────────────────────────────

  private verificarConductor(): void {
    const conductorId = this.form.get('conductorId')!.value as number | null;
    const fecha       = this.form.get('fecha')!.value as Date | null;

    if (!conductorId || !fecha) {
      this.hayConflictoConductor = false;
      this.quitarError(this.form.get('conductorId')!, 'conflicto');
      return;
    }

    const fechaStr   = this.formatFecha(fecha);
    const horaSalida = this.form.get('horaSalida')!.value as string;
    const tolerancia = (this.form.get('toleranciaMinutos')!.value as number) ?? 5;

    this.verificandoConductor = true;
    this.programacionService.getProgramacionesByConductorYFecha(conductorId, fechaStr).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (progs) => {
        const conflicto = this.tieneConflictoHorario(progs, horaSalida, tolerancia);
        this.hayConflictoConductor = conflicto;
        const ctrl = this.form.get('conductorId')!;
        if (conflicto) ctrl.setErrors({ ...ctrl.errors, conflicto: true });
        else           this.quitarError(ctrl, 'conflicto');
        this.verificandoConductor = false;
      },
      error: () => { this.verificandoConductor = false; },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Comprueba solapamiento de horario igual a como lo hace el backend.
   *  Una programación FINALIZADA o CANCELADA libera el bus/conductor,
   *  así que se pueden reutilizar aunque exista una previa en esos estados. */
  private tieneConflictoHorario(progs: any[], horaSalida: string, toleranciaMin: number): boolean {
    const activas = (Array.isArray(progs) ? progs : (progs as any).data ?? [])
      .filter((p: any) => p.estado !== 'CANCELADO' && p.estado !== 'FINALIZADO');

    if (activas.length === 0) return false;
    if (!horaSalida) return true;

    return activas.some((p: any) =>
      Math.abs(this.timeToSec(p.horaSalida) - this.timeToSec(horaSalida)) <= toleranciaMin * 60,
    );
  }

  private quitarError(ctrl: any, clave: string): void {
    if (ctrl.errors?.[clave]) {
      const { [clave]: _, ...resto } = ctrl.errors;
      ctrl.setErrors(Object.keys(resto).length > 0 ? resto : null);
    }
    if (clave === 'conflicto') {
      // reset the corresponding flag depending on which control this is
    }
  }

  private timeToSec(time: string): number {
    const partes = time.split(':').map(Number);
    return (partes[0] ?? 0) * 3600 + (partes[1] ?? 0) * 60 + (partes[2] ?? 0);
  }

  private formatFecha(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  onToggleRecurrencia(activo: boolean): void {
    this.esRecurrente = activo;
    if (!activo) this.form.get('tipoRecurrencia')!.setValue('DIARIA');
  }

  onCancelar(): void {
    this.dialogRef.close(null);
  }

  onGuardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.hayConflictoBus || this.hayConflictoConductor) return;

    const raw = this.form.value;
    const dto = {
      rutaId:            raw.rutaId as number,
      busId:             raw.busId as number,
      conductorId:       raw.conductorId as number,
      fecha:             this.formatFecha(raw.fecha as Date),
      horaSalida:        raw.horaSalida as string,
      toleranciaMinutos: raw.toleranciaMinutos as number,
      recurrente:        (this.esRecurrente ? raw.tipoRecurrencia : 'UNICA') as RecurrenciaEnum,
    };

    this.isGuardando = true;
    this.programacionService.crearProgramacion(dto).subscribe({
      next: (prog) => {
        this.isGuardando = false;
        this.dialogRef.close(prog);
      },
      error: (err: Error) => {
        this.isGuardando = false;
        const msg = err?.message ?? '';
        if (msg.toLowerCase().includes('solapa') || msg.toLowerCase().includes('overlap')) {
          this.toast.warning('Ya existe una programación que se solapa en esa fecha y horario.');
          this.hayConflictoBus = true;
          this.form.get('busId')!.setErrors({ conflicto: true });
        } else {
          this.toast.error('Error al crear la programación');
        }
      },
    });
  }

  nombreConductor(c: Conductor): string {
    return `${c.persona.nombres} ${c.persona.apellidos}`;
  }

  get isValidando(): boolean {
    return this.verificandoBus || this.verificandoConductor;
  }

  get puedeGuardar(): boolean {
    return !this.isGuardando && !this.isCargando && !this.isValidando
      && !this.hayConflictoBus && !this.hayConflictoConductor;
  }

  get rutaIdCtrl()          { return this.form.get('rutaId')!; }
  get busIdCtrl()           { return this.form.get('busId')!; }
  get conductorIdCtrl()     { return this.form.get('conductorId')!; }
  get fechaCtrl()           { return this.form.get('fecha')!; }
  get horaSalidaCtrl()      { return this.form.get('horaSalida')!; }
  get toleranciaCtrl()      { return this.form.get('toleranciaMinutos')!; }
  get tipoRecurrenciaCtrl() { return this.form.get('tipoRecurrencia')!; }
}
