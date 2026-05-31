import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { IncidenteBusService, IncidenteDetalle, FotoIncidente } from '../../services/incidente-bus.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonLoaderComponent } from '../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

interface ComentarioSession {
  texto: string;
  fecha: Date;
}

@Component({
  selector: 'app-incidentes-bus',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatProgressSpinnerModule,
    MatInputModule,
    SkeletonLoaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './incidentes-bus.component.html',
  styleUrl: './incidentes-bus.component.scss'
})
export class IncidentesBusComponent implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatDrawer;

  busId = 0;
  incidentes: IncidenteDetalle[] = [];
  todasLasFotos: FotoIncidente[] = [];
  fotosDelIncidente: FotoIncidente[] = [];
  fotosLoaded = false;
  isLoading = true;
  isLoadingFotos = false;
  isActualizando = false;

  filtroTipo = '';
  filtroEstado = '';

  incidenteSeleccionado: IncidenteDetalle | null = null;
  comentariosPorIncidente = new Map<number, ComentarioSession[]>();
  nuevoComentario = '';
  nuevoEstado = '';

  get columnas(): string[] {
    return this.modoBus
      ? ['fecha', 'conductor', 'tipo', 'gravedad', 'estado']
      : ['fecha', 'bus', 'conductor', 'tipo', 'gravedad', 'estado'];
  }

  readonly tipoOpciones = [
    { value: '', label: 'Todos los tipos' },
    { value: 'MECANICO', label: 'Mecánico' },
    { value: 'ACCIDENTE', label: 'Accidente' },
    { value: 'ELECTRICO', label: 'Eléctrico' },
    { value: 'OTRO', label: 'Otro' }
  ];

  readonly estadoOpciones = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'RESUELTO', label: 'Resuelto' }
  ];

  readonly estadoCambioOpciones = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'RESUELTO', label: 'Resuelto' }
  ];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidenteService: IncidenteBusService,
    private toast: ToastService
  ) {}

  get modoBus(): boolean {
    return this.busId > 0;
  }

  ngOnInit(): void {
    this.busId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.cargarIncidentes();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get incidentesFiltrados(): IncidenteDetalle[] {
    if (!Array.isArray(this.incidentes)) return [];
    return this.incidentes.filter(i => {
      const coincideTipo = !this.filtroTipo || i.tipo === this.filtroTipo;
      const coincideEstado = !this.filtroEstado || i.estado === this.filtroEstado;
      return coincideTipo && coincideEstado;
    });
  }

  get totalIncidentes(): number {
    return Array.isArray(this.incidentes) ? this.incidentes.length : 0;
  }

  get tipoMasFrecuente(): string {
    if (!Array.isArray(this.incidentes) || !this.incidentes.length) return '—';
    const conteo = this.incidentes.reduce((acc, i) => {
      acc[i.tipo] = (acc[i.tipo] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const tipo = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return this.labelTipo(tipo);
  }

  get tasaResolucion(): number {
    if (!Array.isArray(this.incidentes) || !this.incidentes.length) return 0;
    const resueltos = this.incidentes.filter(i => i.estado === 'RESUELTO').length;
    return Math.round((resueltos / this.incidentes.length) * 100);
  }

  get comentariosDelIncidente(): ComentarioSession[] {
    if (!this.incidenteSeleccionado) return [];
    return this.comentariosPorIncidente.get(this.incidenteSeleccionado.id) ?? [];
  }

  get estadoCambiado(): boolean {
    return !!this.incidenteSeleccionado && this.nuevoEstado !== this.incidenteSeleccionado.estado;
  }

  private normalizar<T>(respuesta: any): T[] {
    if (Array.isArray(respuesta)) return respuesta as T[];
    if (Array.isArray(respuesta?.data)) return respuesta.data as T[];
    return [];
  }

  private cargarIncidentes(): void {
    this.isLoading = true;
    const sub = this.incidenteService.getIncidentes().subscribe({
      next: (respuesta: any) => {
        const todos = this.normalizar<IncidenteDetalle>(respuesta);
        this.incidentes = this.modoBus
          ? todos.filter(i => Number(i.bus?.id) === this.busId)
          : todos;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
    this.subs.push(sub);
  }

  private cargarFotos(): void {
    if (this.fotosLoaded) {
      this.filtrarFotosSeleccionado();
      return;
    }
    this.isLoadingFotos = true;
    const sub = this.incidenteService.getFotos().subscribe({
      next: (respuesta: any) => {
        this.todasLasFotos = this.normalizar<FotoIncidente>(respuesta);
        this.fotosLoaded = true;
        this.isLoadingFotos = false;
        this.filtrarFotosSeleccionado();
      },
      error: () => {
        this.isLoadingFotos = false;
      }
    });
    this.subs.push(sub);
  }

  private filtrarFotosSeleccionado(): void {
    if (!this.incidenteSeleccionado) return;
    const id = this.incidenteSeleccionado.id;
    this.fotosDelIncidente = this.todasLasFotos.filter(f => Number(f.incidente?.id) === id);
  }

  onClickFila(incidente: IncidenteDetalle): void {
    this.incidenteSeleccionado = incidente;
    this.nuevoComentario = '';
    this.nuevoEstado = incidente.estado;
    this.fotosDelIncidente = [];
    this.drawer.open();
    this.cargarFotos();
  }

  onDrawerClosed(): void {
    this.incidenteSeleccionado = null;
  }

  cerrarDrawer(): void {
    this.drawer.close();
  }

  agregarComentario(): void {
    const texto = this.nuevoComentario.trim();
    if (!texto || !this.incidenteSeleccionado) return;
    const id = this.incidenteSeleccionado.id;
    const lista = this.comentariosPorIncidente.get(id) ?? [];
    lista.push({ texto, fecha: new Date() });
    this.comentariosPorIncidente.set(id, lista);
    this.nuevoComentario = '';
  }

  guardarCambioEstado(): void {
    if (!this.incidenteSeleccionado || !this.estadoCambiado) return;
    this.isActualizando = true;
    const id = this.incidenteSeleccionado.id;
    const sub = this.incidenteService.actualizarEstado(id, this.nuevoEstado).subscribe({
      next: (actualizado) => {
        const idx = this.incidentes.findIndex(i => i.id === id);
        if (idx !== -1) {
          this.incidentes[idx] = { ...this.incidentes[idx], estado: actualizado.estado };
        }
        this.incidenteSeleccionado = { ...this.incidenteSeleccionado!, estado: actualizado.estado };
        this.isActualizando = false;
        this.toast.success('Estado del incidente actualizado correctamente.');
      },
      error: () => {
        this.isActualizando = false;
      }
    });
    this.subs.push(sub);
  }

  onVolver(): void {
    this.router.navigate(this.modoBus ? ['/admin/buses'] : ['/admin']);
  }

  labelTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      MECANICO: 'Mecánico', ACCIDENTE: 'Accidente', ELECTRICO: 'Eléctrico', OTRO: 'Otro'
    };
    return mapa[tipo] ?? tipo;
  }

  labelEstado(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', RESUELTO: 'Resuelto'
    };
    return mapa[estado] ?? estado;
  }

  labelGravedad(gravedad: string): string {
    const mapa: Record<string, string> = {
      BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica'
    };
    return mapa[gravedad] ?? gravedad;
  }

  claseGravedad(gravedad: string): string {
    const mapa: Record<string, string> = {
      BAJA: 'chip-baja', MEDIA: 'chip-media', ALTA: 'chip-alta', CRITICA: 'chip-critica'
    };
    return mapa[gravedad] ?? '';
  }

  claseEstado(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'chip-pendiente', EN_PROCESO: 'chip-en-proceso', RESUELTO: 'chip-resuelto'
    };
    return mapa[estado] ?? '';
  }

  nombreConductor(incidente: IncidenteDetalle): string {
    if (!incidente.reportadoPor) return '—';
    return `${incidente.reportadoPor.nombres} ${incidente.reportadoPor.apellidos}`;
  }
}
