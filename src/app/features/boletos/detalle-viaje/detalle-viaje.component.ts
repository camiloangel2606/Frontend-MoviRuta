import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonLoaderComponent } from '../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { environment } from '../../../../environments/environment';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

interface ParaderoEnRuta {
  id: number;
  orden: number;
  paradero: { id: number; nombre: string; latitud: number; longitud: number; tipo: string };
  tiempoEstimadoDesdeAnterior?: number;
}

interface BoletoDetalle {
  id: number;
  estado: 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
  costo: number;
  horaFin: string | null;
  programacion: {
    id: number;
    horaSalida: string;
    fecha: string;
    bus: { id: number; placa: string; modelo: string };
    conductorAsignado: { id: number; persona: { nombres: string; apellidos: string } };
    ruta: { id: number; nombre: string };
  };
  rutaParaderoOrigen: ParaderoEnRuta | null;
  rutaParaderoDescenso: ParaderoEnRuta | null;
}

@Component({
  selector: 'app-detalle-viaje',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './detalle-viaje.component.html',
  styleUrl: './detalle-viaje.component.scss',
})
export class DetalleViajeComponent implements OnInit, OnDestroy {
  isLoading = true;
  error = false;
  boleto: BoletoDetalle | null = null;
  paraderos: ParaderoEnRuta[] = [];

  private mapa: L.Map | null = null;

  @ViewChild('mapaDiv') set mapaDiv(el: ElementRef | undefined) {
    if (el && !this.mapa && this.paraderos.length > 0) {
      this.ngZone.runOutsideAngular(() => this.initMap(el.nativeElement));
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toast.error('ID de viaje no válido');
      this.router.navigate(['/movilidad/boletos']);
      return;
    }
    this.cargarDetalle(+id);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
  }

  private cargarDetalle(id: number): void {
    this.isLoading = true;
    this.error = false;

    this.api.get<BoletoDetalle>(`${environment.negocioUrl}/boleto/${id}`).subscribe({
      next: (boleto) => {
        this.boleto = boleto;
        const rutaId = boleto.programacion?.ruta?.id;
        if (rutaId) {
          this.cargarParaderos(rutaId);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.toast.error('No se pudo cargar el detalle del viaje');
        this.error = true;
        this.isLoading = false;
      },
    });
  }

  private cargarParaderos(rutaId: number): void {
    this.api.get<ParaderoEnRuta[]>(`${environment.negocioUrl}/ruta/${rutaId}/paraderos`).subscribe({
      next: (paraderos) => {
        this.paraderos = [...paraderos].sort((a, b) => a.orden - b.orden);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private initMap(el: HTMLElement): void {
    if (this.mapa) return;

    const coords = this.paraderos
      .filter(p => p.paradero?.latitud && p.paradero?.longitud)
      .map(p => [p.paradero.latitud, p.paradero.longitud] as L.LatLngTuple);

    if (coords.length === 0) return;

    this.mapa = L.map(el, { zoomControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.mapa);

    const polyline = L.polyline(coords, { color: '#1775ff', weight: 5, opacity: 0.85 }).addTo(this.mapa);
    this.mapa.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    const origenId = this.boleto?.rutaParaderoOrigen?.paradero?.id;
    const descensoId = this.boleto?.rutaParaderoDescenso?.paradero?.id;

    this.paraderos.forEach(rp => {
      const { id, nombre, latitud, longitud } = rp.paradero;
      const esOrigen = id === origenId;
      const esDescenso = id === descensoId;

      const icono = esOrigen
        ? this.crearIcono('#16a34a', 'directions_run', 34)
        : esDescenso
          ? this.crearIcono('#dc2626', 'flag', 34)
          : this.crearIcono('#475569', 'radio_button_checked', 20);

      L.marker([latitud, longitud], { icon: icono })
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:140px">
             <strong>${nombre}</strong><br>
             <small style="color:#64748b">Parada #${rp.orden}${esOrigen ? ' · Abordaje' : esDescenso ? ' · Descenso' : ''}</small>
           </div>`,
        )
        .addTo(this.mapa!);
    });
  }

  private crearIcono(color: string, iconName: string, size: number): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="background:${color};color:#fff;border-radius:50%;
                         width:${size}px;height:${size}px;display:flex;align-items:center;
                         justify-content:center;font-size:${Math.round(size * 0.5)}px;
                         box-shadow:0 3px 8px rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.9);
                         font-family:'Material Icons';font-weight:normal;">
               <span class="material-icons" style="font-size:${Math.round(size * 0.5)}px;">${iconName}</span>
             </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2) - 4],
    });
  }

  volver(): void {
    this.router.navigate(['/movilidad/boletos']);
  }

  // ── Getters computados ───────────────────────────────────────────────────

  get nombreConductor(): string {
    const p = this.boleto?.programacion?.conductorAsignado?.persona;
    if (!p) return '—';
    return `${p.nombres} ${p.apellidos}`.trim();
  }

  get placaBus(): string {
    return this.boleto?.programacion?.bus?.placa ?? '—';
  }

  get modeloBus(): string {
    return this.boleto?.programacion?.bus?.modelo ?? '—';
  }

  get nombreRuta(): string {
    return this.boleto?.programacion?.ruta?.nombre ?? '—';
  }

  get paraderoOrigen(): string {
    return this.boleto?.rutaParaderoOrigen?.paradero?.nombre ?? '—';
  }

  get paraderoDescenso(): string {
    return this.boleto?.rutaParaderoDescenso?.paradero?.nombre ?? '—';
  }

  get horaAbordaje(): string {
    const fecha = this.boleto?.programacion?.fecha;
    const hora = this.boleto?.programacion?.horaSalida;
    if (!fecha || !hora) return '—';
    return this.formatFecha(`${fecha}T${hora}`);
  }

  get horaDescenso(): string {
    return this.boleto?.horaFin ? this.formatFecha(this.boleto.horaFin) : '—';
  }

  get tiempoTotal(): string {
    const fecha = this.boleto?.programacion?.fecha;
    const hora = this.boleto?.programacion?.horaSalida;
    const fin = this.boleto?.horaFin;
    if (!fecha || !hora || !fin) return '—';

    const inicio = new Date(`${fecha}T${hora}`);
    const finDate = new Date(fin);
    const diffMs = finDate.getTime() - inicio.getTime();
    if (diffMs <= 0) return '—';

    const mins = Math.floor(diffMs / 60000);
    const horas = Math.floor(mins / 60);
    const restoMins = mins % 60;
    return horas > 0 ? `${horas}h ${restoMins}min` : `${mins} min`;
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      ACTIVO: 'En curso',
      COMPLETADO: 'Completado',
      CANCELADO: 'Cancelado',
    };
    return labels[this.boleto?.estado ?? ''] ?? this.boleto?.estado ?? '—';
  }

  get estadoClase(): string {
    const clases: Record<string, string> = {
      ACTIVO: 'estado-activo',
      COMPLETADO: 'estado-completado',
      CANCELADO: 'estado-cancelado',
    };
    return clases[this.boleto?.estado ?? ''] ?? '';
  }

  private formatFecha(valor: string): string {
    try {
      return new Date(valor).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return valor;
    }
  }
}
