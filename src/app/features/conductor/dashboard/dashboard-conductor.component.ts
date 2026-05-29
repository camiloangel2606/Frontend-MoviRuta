import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, forkJoin, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { SkeletonLoaderComponent } from '../../../shared/components/loader/loader.component';
import { TurnoService, Turno, Programacion, Gps } from '../turno.service';
import { IniciarTurnoDialogComponent } from './iniciar-turno-dialog/iniciar-turno-dialog.component';

@Component({
  selector: 'app-dashboard-conductor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDialogModule,
    EmptyStateComponent,
    SkeletonLoaderComponent
  ],
  templateUrl: './dashboard-conductor.component.html',
  styleUrl: './dashboard-conductor.component.scss'
})
export class DashboardConductorComponent implements OnInit, OnDestroy {
  turno$ = new BehaviorSubject<Turno | null>(null);
  programacion$ = new BehaviorSubject<Programacion | null>(null);
  isLoading = true;
  error: string | null = null;
  readonly fechaHoy = new Date();

  gps: Gps | null = null;
  gpsActivo = false;
  gpsCargando = false;
  gpsError: string | null = null;
  posicionActual: { lat: number; lng: number } | null = null;
  private watchId: number | null = null;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private turnoService: TurnoService,
    private dialog: MatDialog,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.cargarTurnoHoy();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.detenerGps();
  }

  cargarTurnoHoy(): void {
    this.isLoading = true;
    this.error = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.isLoading = false;
      this.error = 'No se pudo identificar el usuario autenticado.';
      return;
    }

    const hoy = this.fechaHoy.toISOString().split('T')[0];

    const sub = this.turnoService.getPersonaBySecurity(currentUser.id).pipe(
      switchMap(persona =>
        this.turnoService.getConductores().pipe(
          map(conductores => {
            // Number() evita fallos por tipo (string vs number en la respuesta)
            const conductor = conductores.find(
              c => Number((c.persona as any)?.id ?? c.persona) === Number(persona.id)
            );
            if (!conductor) {
              throw new Error('No se encontró el perfil de conductor asociado a esta cuenta.');
            }
            return conductor;
          })
        )
      ),
      switchMap(conductor =>
        forkJoin({
          turnos: this.turnoService.getTurnosConductor(conductor.id),
          programaciones: this.turnoService.getProgramaciones()
        }).pipe(
          map(({ turnos, programaciones }) => {
            const conductorId = Number(conductor.id);
            const ahora = Date.now();

            // Prioridad: 1) EN_CURSO  2) próximo PROGRAMADO (fecha >= ahora)
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

            // Programación relacionada: misma fecha que el turno relevante
            const fechaTurno = turnoRelevante
              ? new Date(turnoRelevante.inicio).toISOString().split('T')[0]
              : hoy;

            const progRelacionada = programaciones.find(p => {
              const pCondId = Number((p.conductorAsignado as any)?.id ?? p.conductorAsignado);
              return pCondId === conductorId && p.fecha === fechaTurno;
            }) ?? null;

            return { turno: turnoRelevante, programacion: progRelacionada };
          })
        )
      )
    ).subscribe({
      next: ({ turno, programacion }) => {
        this.turno$.next(turno);
        this.programacion$.next(programacion);
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.error = err.message || 'Error al cargar el turno del día.';
        this.isLoading = false;
      }
    });

    this.subs.push(sub);
  }

  get turno(): Turno | null {
    return this.turno$.value;
  }

  get programacion(): Programacion | null {
    return this.programacion$.value;
  }

  get puedeIniciar(): boolean {
    return this.turno?.estado?.toUpperCase() === 'PROGRAMADO';
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      PROGRAMADO: 'Programado',
      EN_CURSO: 'En Curso',
      FINALIZADO: 'Finalizado'
    };
    return labels[this.turno?.estado?.toUpperCase() ?? ''] ?? '';
  }

  get estadoClass(): string {
    const classes: Record<string, string> = {
      PROGRAMADO: 'estado--programado',
      EN_CURSO: 'estado--en-curso',
      FINALIZADO: 'estado--finalizado'
    };
    return classes[this.turno?.estado?.toUpperCase() ?? ''] ?? '';
  }

  get estadoIcono(): string {
    const icons: Record<string, string> = {
      PROGRAMADO: 'radio_button_unchecked',
      EN_CURSO: 'play_circle',
      FINALIZADO: 'check_circle'
    };
    return icons[this.turno?.estado?.toUpperCase() ?? ''] ?? 'schedule';
  }

  abrirDialogoIniciar(): void {
    if (!this.turno) return;

    const ref = this.dialog.open(IniciarTurnoDialogComponent, {
      width: '480px',
      disableClose: true,
      data: {
        turnoId: this.turno.id,
        bus: `${this.turno.bus.placa} — ${this.turno.bus.modelo}`
      }
    });

    const refSub = ref.afterClosed().subscribe((turnoActualizado: Turno | undefined) => {
      if (turnoActualizado) {
        this.turno$.next(turnoActualizado);
        this.toast.success('Turno iniciado correctamente. ¡Buen viaje!');
      }
    });

    this.subs.push(refSub);
  }

  formatHoraSalida(horaSalida: string | null | undefined): string {
    if (!horaSalida) return '—';
    const [h, m] = horaSalida.split(':');
    const d = new Date();
    d.setHours(+h, +m, 0, 0);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatHora(datetime: string | null | undefined): string {
    if (!datetime) return '—';
    return new Date(datetime).toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  formatFechaHoy(): string {
    return this.fechaHoy.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  activarGps(): void {
    if (!navigator.geolocation) {
      this.gpsError = 'Tu navegador no soporta geolocalización.';
      return;
    }

    this.gpsCargando = true;
    this.gpsError = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const busId = Number(this.turno?.bus?.id);
        const sub = this.turnoService.getGps().subscribe({
          next: (dispositivos) => {
            const dispositivo = dispositivos.find(
              g => Number((g.bus as any)?.id ?? g.bus) === busId
            );
            if (!dispositivo) {
              this.gpsError = 'No hay dispositivo GPS registrado para este bus.';
              this.gpsCargando = false;
              return;
            }
            this.gps = dispositivo;
            this.iniciarWatchPosition();
            this.gpsCargando = false;
          },
          error: () => {
            this.gpsError = 'No se pudo consultar el dispositivo GPS.';
            this.gpsCargando = false;
          }
        });
        this.subs.push(sub);
      },
      (err) => {
        this.gpsError = err.code === 1
          ? 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'
          : 'No se pudo obtener la ubicación.';
        this.gpsCargando = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private iniciarWatchPosition(): void {
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.posicionActual = { lat, lng };
        this.gpsActivo = true;

        if (this.gps) {
          const sub = this.turnoService.actualizarPosicion(this.gps.id, lat, lng).subscribe();
          this.subs.push(sub);
        }
      },
      () => {
        this.gpsError = 'Se perdió la señal de ubicación.';
        this.gpsActivo = false;
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  detenerGps(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.gpsActivo = false;
    this.posicionActual = null;
  }
}
