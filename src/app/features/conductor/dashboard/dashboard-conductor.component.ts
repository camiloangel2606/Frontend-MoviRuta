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
  isCreandoTurno = false;
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

    const d = this.fechaHoy;
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
          // Sólo pedimos turnos activos al backend — los finalizados/cancelados no interesan aquí.
          turnos:        this.turnoService.getTurnosConductor(conductor.id, ['PROGRAMADO', 'EN_CURSO']),
          programaciones: this.turnoService.getProgramacionesConductorFecha(conductor.id, hoy),
        }).pipe(
          map(({ turnos, programaciones }) => {
            const ahora = Date.now();

            // Turno relevante:
            //   1º Un EN_CURSO (solo puede haber uno activo) → ese.
            //   2º Si no, el PROGRAMADO más PRÓXIMO en el futuro (mínimo inicio >= ahora).
            //   3º Si tampoco hay futuro, el PROGRAMADO más reciente del pasado (por si
            //      el conductor olvidó iniciarlo y aún quiere arrancarlo).
            const enCurso = turnos.find(t => t.estado?.toUpperCase() === 'EN_CURSO') ?? null;

            const programados = turnos
              .filter(t => t.estado?.toUpperCase() === 'PROGRAMADO')
              .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

            const proximoFuturo = programados.find(t => new Date(t.inicio).getTime() >= ahora) ?? null;
            const ultimoPasado  = [...programados].reverse().find(t => new Date(t.inicio).getTime() < ahora) ?? null;

            const turnoRelevante = enCurso ?? proximoFuturo ?? ultimoPasado;

            // Programaciones del día — excluimos FINALIZADO/CANCELADO porque
            // esas ya consumieron su turno (o nunca se ejecutarán).
            const progsActivas = programaciones
              .filter(p => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO')
              .sort((a, b) => a.horaSalida.localeCompare(b.horaSalida));

            // Si hay turno EN_CURSO, intentamos emparejar por bus (la programación
            // que está corriendo ahora). Si no, tomamos la próxima en horario futuro;
            // si no hay futura, la última activa de hoy (por si el conductor llega tarde).
            const ahoraHHMM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:00`;
            const proximaProgFutura = progsActivas.find(p => p.horaSalida >= ahoraHHMM) ?? null;
            const ultimaProgActiva  = progsActivas[progsActivas.length - 1] ?? null;

            const progHoy = turnoRelevante
              ? (progsActivas.find(p => p.bus?.id === turnoRelevante.bus?.id)
                  ?? proximaProgFutura
                  ?? ultimaProgActiva)
              : (proximaProgFutura ?? ultimaProgActiva);

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

  abrirDialogoIniciar(): void {
    // Sin turno previo → crearlo silenciosamente desde la programación y luego abrir el diálogo
    if (!this.turno && this.programacion && this.conductorId !== null) {
      this.isCreandoTurno = true;
      const sub = this.turnoService.crearTurno({
        conductorId: this.conductorId,
        busId:       this.programacion.bus.id,
        inicio:      new Date().toISOString(),
      }).subscribe({
        next: (turnoCreado) => {
          this.isCreandoTurno = false;
          this.turno$.next(turnoCreado);
          this.abrirDialogoIniciar(); // re-entrar con turno ya disponible
        },
        error: () => {
          this.isCreandoTurno = false;
          this.toast.warning('No se pudo registrar el turno. Intenta de nuevo.');
        },
      });
      this.subs.push(sub);
      return;
    }

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
