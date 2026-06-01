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
import { FinalizarTurnoDialogComponent } from './finalizar-turno-dialog/finalizar-turno-dialog.component';
import { CrearTurnoDialogComponent } from './crear-turno-dialog/crear-turno-dialog.component';

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
    SkeletonLoaderComponent,
  ],
  templateUrl: './dashboard-conductor.component.html',
  styleUrl: './dashboard-conductor.component.scss',
})
export class DashboardConductorComponent implements OnInit, OnDestroy {
  turno$ = new BehaviorSubject<Turno | null>(null);
  programacion$ = new BehaviorSubject<Programacion | null>(null);

  isLoading = true;
  error: string | null = null;
  readonly fechaHoy = new Date();

  conductorId: number | null = null;
  programacionId: number | null = null;

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
    private toast: ToastService,
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
            const conductor = conductores.find(
              c => Number((c.persona as any)?.id ?? c.persona) === Number(persona.id),
            );
            if (!conductor) {
              throw new Error('No se encontró el perfil de conductor asociado a esta cuenta.');
            }
            return conductor;
          }),
        ),
      ),
      switchMap(conductor =>
        forkJoin({
          turnos:        this.turnoService.getTurnosConductor(conductor.id),
          programaciones: this.turnoService.getProgramacionesConductorFecha(conductor.id, hoy),
        }).pipe(
          map(({ turnos, programaciones }) => {
            const ahora = Date.now();

            // Turno relevante: EN_CURSO primero, luego PROGRAMADO reciente
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
                const aEC = a.estado?.toUpperCase() === 'EN_CURSO';
                const bEC = b.estado?.toUpperCase() === 'EN_CURSO';
                if (aEC && !bEC) return -1;
                if (!aEC && bEC) return 1;
                return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
              })[0] ?? null;

            // Programacion de hoy: si hay turno, intentar emparejar por bus;
            // si no, tomar la primera (más temprana)
            const progsSorted = [...programaciones].sort((a, b) =>
              a.horaSalida.localeCompare(b.horaSalida),
            );
            const progHoy = turnoRelevante
              ? (progsSorted.find(p => p.bus?.id === turnoRelevante.bus?.id) ?? progsSorted[0] ?? null)
              : (progsSorted[0] ?? null);

            return { turno: turnoRelevante, programacion: progHoy, conductorId: Number(conductor.id) };
          }),
        ),
      ),
    ).subscribe({
      next: ({ turno, programacion, conductorId }) => {
        this.conductorId    = conductorId;
        this.programacionId = programacion?.id ?? null;
        this.turno$.next(turno);
        this.programacion$.next(programacion);
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.error = err.message || 'Error al cargar el turno del día.';
        this.isLoading = false;
      },
    });

    this.subs.push(sub);
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get turno(): Turno | null        { return this.turno$.value; }
  get programacion(): Programacion | null { return this.programacion$.value; }

  /** Tiene programacion para hoy pero todavía no creó el turno */
  get tieneProgramacionSinTurno(): boolean {
    return !this.turno && !!this.programacion;
  }

  /** No tiene ni programacion ni turno para hoy */
  get sinNada(): boolean {
    return !this.turno && !this.programacion;
  }

  get puedeCrear(): boolean {
    return !this.turno || this.turno.estado?.toUpperCase() === 'FINALIZADO';
  }

  get puedeIniciar(): boolean {
    return this.turno?.estado?.toUpperCase() === 'PROGRAMADO';
  }

  get puedeFinalizar(): boolean {
    return this.turno?.estado?.toUpperCase() === 'EN_CURSO';
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      PROGRAMADO: 'Programado', EN_CURSO: 'En Curso', FINALIZADO: 'Finalizado',
    };
    return labels[this.turno?.estado?.toUpperCase() ?? ''] ?? '';
  }

  get estadoClass(): string {
    const classes: Record<string, string> = {
      PROGRAMADO: 'estado--programado', EN_CURSO: 'estado--en-curso', FINALIZADO: 'estado--finalizado',
    };
    return classes[this.turno?.estado?.toUpperCase() ?? ''] ?? '';
  }

  get estadoIcono(): string {
    const icons: Record<string, string> = {
      PROGRAMADO: 'radio_button_unchecked', EN_CURSO: 'play_circle', FINALIZADO: 'check_circle',
    };
    return icons[this.turno?.estado?.toUpperCase() ?? ''] ?? 'schedule';
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  abrirDialogoCrearTurno(): void {
    if (this.conductorId === null) {
      this.toast.warning('No se identificó tu perfil de conductor. Recarga la página.');
      return;
    }

    // Pre-fill fecha y hora desde la programacion si existe
    let fechaSugerida: Date | undefined;
    let horaSugerida: string | undefined;
    if (this.programacion) {
      const [y, m, d] = this.programacion.fecha.split('-').map(Number);
      fechaSugerida = new Date(y, m - 1, d);
      horaSugerida  = this.programacion.horaSalida.substring(0, 5); // "HH:mm"
    }

    const ref = this.dialog.open(CrearTurnoDialogComponent, {
      width: '500px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
      data: {
        conductorId:       this.conductorId,
        busIdSugerido:     this.programacion?.bus?.id,
        busNombreSugerido: this.programacion?.bus
          ? `${this.programacion.bus.placa} — ${this.programacion.bus.modelo}` : undefined,
        fechaSugerida,
        horaSugerida,
      },
    });

    const refSub = ref.afterClosed().subscribe((turno: Turno | undefined) => {
      if (turno) {
        this.turno$.next(turno);
        this.toast.success('Turno creado correctamente.');
      }
    });
    this.subs.push(refSub);
  }

  abrirDialogoIniciar(): void {
    if (!this.turno) return;

    const ref = this.dialog.open(IniciarTurnoDialogComponent, {
      width: '480px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
      data: {
        turnoId: this.turno.id,
        bus:     `${this.turno.bus.placa} — ${this.turno.bus.modelo}`,
      },
    });

    const refSub = ref.afterClosed().subscribe((turnoActualizado: Turno | undefined) => {
      if (turnoActualizado) {
        this.turno$.next(turnoActualizado);
        this.toast.success('Turno iniciado correctamente. ¡Buen viaje!');
        // Sincronizar estado de la programacion
        this.sincronizarEstadoProgramacion('EN_CURSO');
      }
    });
    this.subs.push(refSub);
  }

  abrirDialogoFinalizar(): void {
    if (!this.turno) return;

    const ref = this.dialog.open(FinalizarTurnoDialogComponent, {
      width: '440px',
      maxWidth: '96vw',
      maxHeight: 'calc(100vh - 100px)',
      position: { top: '92px' },
      disableClose: true,
      data: {
        turnoId:     this.turno.id,
        bus:         `${this.turno.bus.placa} — ${this.turno.bus.modelo}`,
        inicioLabel: this.formatHora(this.turno.inicio),
      },
    });

    const refSub = ref.afterClosed().subscribe((turnoFinalizado: Turno | undefined) => {
      if (turnoFinalizado) {
        this.detenerGps();
        this.turno$.next(turnoFinalizado);
        this.toast.success('Turno finalizado. ¡Buen trabajo!');
        // Sincronizar estado de la programacion
        this.sincronizarEstadoProgramacion('FINALIZADO');
      }
    });
    this.subs.push(refSub);
  }

  /** Actualiza el estado de la programacion asociada en el backend y en local */
  private sincronizarEstadoProgramacion(estado: 'EN_CURSO' | 'FINALIZADO'): void {
    if (!this.programacionId) return;

    const sub = this.turnoService.actualizarEstadoProgramacion(this.programacionId, estado)
      .subscribe({
        next: () => {
          if (this.programacion) {
            this.programacion$.next({ ...this.programacion, estado } as Programacion);
          }
        },
        error: () => {
          // No bloquear al conductor si falla — el turno ya fue actualizado
        },
      });
    this.subs.push(sub);
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

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
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatFechaHoy(): string {
    return this.fechaHoy.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // ─── GPS ──────────────────────────────────────────────────────────────────

  activarGps(): void {
    if (!navigator.geolocation) {
      this.gpsError = 'Tu navegador no soporta geolocalización.';
      return;
    }
    this.gpsCargando = true;
    this.gpsError = null;

    navigator.geolocation.getCurrentPosition(
      () => {
        const busId = Number(this.turno?.bus?.id);
        const sub = this.turnoService.getGps().subscribe({
          next: (dispositivos) => {
            const dispositivo = dispositivos.find(
              g => Number((g.bus as any)?.id ?? g.bus) === busId,
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
          },
        });
        this.subs.push(sub);
      },
      (err) => {
        this.gpsError = err.code === 1
          ? 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'
          : 'No se pudo obtener la ubicación.';
        this.gpsCargando = false;
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
      { enableHighAccuracy: true, maximumAge: 5000 },
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
