import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { firstValueFrom, Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonLoaderComponent } from '../../../shared/components/loader/loader.component';
import { TurnoService, Turno, Bus, CreateIncidenteDto } from '../turno.service';
import { ConfirmacionGravedadDialogComponent } from './confirmacion-gravedad-dialog.component';

interface FotoPreview {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-reporte-incidente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    SkeletonLoaderComponent
  ],
  templateUrl: './reporte-incidente.component.html',
  styleUrl: './reporte-incidente.component.scss'
})
export class ReporteIncidenteComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  fotos: FotoPreview[] = [];
  turnoActivo: Turno | null = null;
  personaId: number | null = null;
  isLoadingTurno = true;
  isSubmitting = false;
  errorTurno: string | null = null;
  coordenadasActuales: { lat: number; lng: number } | null = null;
  gpsEstado: 'buscando' | 'obtenido' | 'no-disponible' = 'buscando';

  readonly MAX_FOTOS = 5;
  readonly MAX_DESCRIPCION = 500;

  readonly tipoOptions = [
    { value: 'MECANICO',  label: 'Mecánico'  },
    { value: 'ACCIDENTE', label: 'Accidente' },
    { value: 'ELECTRICO', label: 'Eléctrico' },
    { value: 'OTRO',      label: 'Otro'      }
  ];

  readonly gravedadOptions = [
    { value: 'BAJA',   label: 'Bajo',    color: 'baja'   },
    { value: 'MEDIA',  label: 'Medio',   color: 'media'  },
    { value: 'ALTA',   label: 'Alto',    color: 'alta'   },
    { value: 'CRITICA', label: 'Crítico', color: 'critica' }
  ];

  get charCount(): number {
    return this.form?.get('descripcion')?.value?.length ?? 0;
  }

  get bus(): Bus | null {
    return this.turnoActivo?.bus ?? null;
  }

  get puedeEnviar(): boolean {
    return !this.isLoadingTurno && !!this.turnoActivo?.bus?.id;
  }

  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private turnoService: TurnoService,
    private dialog: MatDialog,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.cargarTurnoActivo();
    this.capturarCoordenadas();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private capturarCoordenadas(): void {
    if (!('geolocation' in navigator)) {
      this.gpsEstado = 'no-disponible';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.coordenadasActuales = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.gpsEstado = 'obtenido';
      },
      () => { this.gpsEstado = 'no-disponible'; },
      { timeout: 10000 }
    );
  }

  private archivoADataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      tipo:        ['', Validators.required],
      gravedad:    ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.maxLength(this.MAX_DESCRIPCION)]]
    });
  }

  private cargarTurnoActivo(): void {
    this.isLoadingTurno = true;
    this.errorTurno = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.isLoadingTurno = false;
      this.errorTurno = 'No se pudo identificar el usuario autenticado.';
      return;
    }

    const ahora = Date.now();

    const sub = this.turnoService.getPersonaBySecurity(currentUser.id).pipe(
      switchMap(persona => {
        this.personaId = persona.id;
        return this.turnoService.getConductores().pipe(
          map(conductores => {
            const conductor = conductores.find(
              c => Number((c.persona as any)?.id ?? c.persona) === Number(persona.id)
            );
            if (!conductor) throw new Error('No se encontró el perfil de conductor asociado a esta cuenta.');
            return conductor;
          })
        );
      }),
      switchMap(conductor =>
        this.turnoService.getTurnosConductor(conductor.id).pipe(
          map(turnos => {
            const turnoRelevante = turnos
              .filter(t => {
                const estado = t.estado?.toUpperCase();
                if (estado === 'EN_CURSO') return true;
                if (estado === 'PROGRAMADO') {
                  return new Date(t.inicio).getTime() >= ahora - 24 * 60 * 60 * 1000;
                }
                return false;
              })
              .sort((a, b) => {
                const aEnCurso = a.estado?.toUpperCase() === 'EN_CURSO';
                const bEnCurso = b.estado?.toUpperCase() === 'EN_CURSO';
                if (aEnCurso && !bEnCurso) return -1;
                if (!aEnCurso && bEnCurso) return 1;
                return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
              })[0] ?? null;
            return turnoRelevante;
          })
        )
      )
    ).subscribe({
      next: turno => {
        this.turnoActivo = turno;
        this.isLoadingTurno = false;
      },
      error: (err: Error) => {
        this.errorTurno = err.message || 'Error al cargar el turno activo.';
        this.isLoadingTurno = false;
      }
    });

    this.subs.push(sub);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const archivos = Array.from(input.files);
    const disponibles = this.MAX_FOTOS - this.fotos.length;
    const seleccionados = archivos.slice(0, disponibles);

    seleccionados.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotos.push({ file, preview: e.target!.result as string });
      };
      reader.readAsDataURL(file);
    });

    if (archivos.length > disponibles) {
      this.toast.warning(`Máximo ${this.MAX_FOTOS} imágenes. Solo se agregaron ${disponibles}.`);
    }

    input.value = '';
  }

  eliminarFoto(index: number): void {
    this.fotos.splice(index, 1);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.turnoActivo?.bus?.id) {
      this.toast.error('No hay un bus asignado en el turno activo.');
      return;
    }

    const gravedad: string = this.form.get('gravedad')!.value;

    if (gravedad === 'ALTA' || gravedad === 'CRITICA') {
      const ref = this.dialog.open(ConfirmacionGravedadDialogComponent, {
        width: '440px',
        disableClose: true,
        data: { gravedad }
      });

      const dialogSub = ref.afterClosed().subscribe((confirmado: boolean) => {
        if (confirmado) this.enviarReporte();
      });
      this.subs.push(dialogSub);
    } else {
      this.enviarReporte();
    }
  }

  private async enviarReporte(): Promise<void> {
    this.isSubmitting = true;
    const { tipo, gravedad, descripcion } = this.form.value;

    const dto: CreateIncidenteDto = {
      busId: this.turnoActivo!.bus.id,
      tipo,
      gravedad,
      descripcion,
      estado: 'PENDIENTE'
    };

    if (this.personaId) dto.reportadoPorId = this.personaId;
    if (this.coordenadasActuales) {
      dto.latitud  = parseFloat(this.coordenadasActuales.lat.toFixed(7));
      dto.longitud = parseFloat(this.coordenadasActuales.lng.toFixed(7));
    }

    try {
      const incidente = await firstValueFrom(this.turnoService.crearIncidente(dto));

      if (this.fotos.length > 0) {
        const subidas = this.fotos.map(async (foto) => {
          const url = await this.archivoADataUrl(foto.file);
          return firstValueFrom(this.turnoService.crearFoto({ incidenteId: incidente.id, url }));
        });
        const resultados = await Promise.allSettled(subidas);
        const fallidas = resultados.filter(r => r.status === 'rejected').length;
        if (fallidas > 0) {
          this.toast.warning(`Incidente registrado, pero ${fallidas} foto(s) no pudieron guardarse.`);
          this.router.navigate(['/conductor/dashboard']);
          return;
        }
      }

      this.toast.success('Incidente reportado correctamente. El equipo de supervisión ha sido notificado.');
      this.router.navigate(['/conductor/dashboard']);
    } catch {
      this.isSubmitting = false;
    }
  }

  onCancelar(): void {
    this.router.navigate(['/conductor/dashboard']);
  }
}
