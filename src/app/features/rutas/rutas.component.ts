import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanificacionService, Ruta, Paradero } from '../../core/services/planificacion.service';
import * as L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-rutas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.scss',
})
export class RutasComponent implements OnInit, OnDestroy {

  // ── Datos ────────────────────────────────────────────────────────────────
  rutas: Ruta[]            = [];
  rutasFiltradas: Ruta[]   = [];
  paraderos: Paradero[]    = [];
  paraderosCercanos: any[] = [];

  rutaSeleccionada: Ruta | null = null;
  tiempoEstimadoTotal: number   = 0;
  paraderosMapa: any[]          = [];

  miLatitud: number | null  = null;
  miLongitud: number | null = null;
  cargandoGps               = false;
  loadingRutas              = false;
  gpsError: string | null   = null;

  // ── Leaflet ───────────────────────────────────────────────────────────────
  private mapa: L.Map | null                  = null;
  private capaMarcadores: L.LayerGroup | null = null;

  // ── Iconos ────────────────────────────────────────────────────────────────
  private readonly iconoParadero = L.divIcon({
    className: '',
    html: `<div style="background:#1d4ed8;color:#fff;border-radius:50%;
                       width:28px;height:28px;display:flex;align-items:center;
                       justify-content:center;font-size:14px;
                       box-shadow:0 2px 6px rgba(0,0,0,.4);">🚌</div>`,
    iconSize:    [28, 28],
    iconAnchor:  [14, 14],
    popupAnchor: [0, -16],
  });

  private readonly iconoTerminal = L.divIcon({
    className: '',
    html: `<div style="background:#dc2626;color:#fff;border-radius:50%;
                       width:34px;height:34px;display:flex;align-items:center;
                       justify-content:center;font-size:18px;
                       box-shadow:0 2px 8px rgba(0,0,0,.5);">🏁</div>`,
    iconSize:    [34, 34],
    iconAnchor:  [17, 17],
    popupAnchor: [0, -20],
  });

  private readonly iconoUsuario = L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;color:#fff;border-radius:50%;
                       width:38px;height:38px;display:flex;align-items:center;
                       justify-content:center;font-size:22px;
                       box-shadow:0 0 0 6px rgba(37,99,235,.25);">📍</div>`,
    iconSize:    [38, 38],
    iconAnchor:  [19, 19],
    popupAnchor: [0, -22],
  });

  private readonly iconoCercano = L.divIcon({
    className: '',
    html: `<div style="background:#f59e0b;color:#fff;border-radius:50%;
                       width:30px;height:30px;display:flex;align-items:center;
                       justify-content:center;font-size:16px;
                       box-shadow:0 2px 6px rgba(0,0,0,.4);">🚏</div>`,
    iconSize:    [30, 30],
    iconAnchor:  [15, 15],
    popupAnchor: [0, -18],
  });

  constructor(
    private planificacionService: PlanificacionService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }
  }

  // ── Tab change ────────────────────────────────────────────────────────────

  alCambiarTab(event: any): void {
    if (event.index === 0) {
      setTimeout(() => this.inicializarMapa(), 150);
    }
  }

  // ── Inicialización del mapa ───────────────────────────────────────────────

  private inicializarMapa(): void {
    if (this.mapa) {
      this.mapa.invalidateSize();
      return;
    }

    const contenedor = document.getElementById('map');
    if (!contenedor) {
      console.warn('inicializarMapa: div#map no encontrado.');
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.mapa = L.map('map', {
        center: [4.6097, -74.0817],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.mapa);

      this.capaMarcadores = L.layerGroup().addTo(this.mapa);

      // Delay mayor: esperar que el layout de Angular Material termine
      setTimeout(() => {
        this.mapa?.invalidateSize();
      }, 400);
    });
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  cargarDatosIniciales(): void {
    this.loadingRutas = true;

    this.planificacionService.getRutas().subscribe({
      next: (data) => {
        this.rutas          = data;
        this.rutasFiltradas = data;
        this.loadingRutas   = false;
      },
      error: (err) => {
        console.error('Error al cargar rutas', err);
        this.loadingRutas = false;
      },
    });

    this.planificacionService.getParaderos().subscribe({
      next:  (data) => (this.paraderos = data),
      error: (err)  => console.error('Error al cargar paraderos', err),
    });
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────

  filtrarRutas(event: Event): void {
    const busqueda = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.rutasFiltradas = busqueda
      ? this.rutas.filter(
          (r) =>
            r.nombre.toLowerCase().includes(busqueda) ||
            r.codigo?.toLowerCase().includes(busqueda),
        )
      : this.rutas;
  }

  // ── Selección de ruta ─────────────────────────────────────────────────────

  seleccionarRuta(ruta: any): void {
    if (!ruta) return;

    this.rutaSeleccionada  = ruta;
    this.paraderosCercanos = [];
    this.miLatitud         = null;
    this.miLongitud        = null;

    this.capaMarcadores?.clearLayers();

    if (
      ruta.paraderosEnRuta &&
      Array.isArray(ruta.paraderosEnRuta) &&
      ruta.paraderosEnRuta.length > 0
    ) {
      this.paraderosMapa = ruta.paraderosEnRuta.map((item: any) => ({
        id:       item?.paradero?.id,
        nombre:   item?.paradero?.nombre,
        latitud:  item?.paradero?.latitud,
        longitud: item?.paradero?.longitud,
        tipo:     item?.paradero?.tipo,
        orden:    item?.orden,
      }));

      this.tiempoEstimadoTotal = ruta.paraderosEnRuta.reduce(
        (acc: number, item: any) =>
          acc + (Number(item?.tiempoEstimadoDesdeAnterior) || 0),
        0,
      );

      this.ngZone.runOutsideAngular(() =>
        this.dibujarRutaEnMapa(this.paraderosMapa),
      );
    } else {
      this.paraderosMapa       = [];
      this.tiempoEstimadoTotal = 0;
    }

    // Recalcular tamaño tras mostrar/ocultar el overlay de itinerario
    setTimeout(() => this.mapa?.invalidateSize(), 50);
    this.cdr.detectChanges();
  }

  private dibujarRutaEnMapa(paraderos: any[]): void {
    if (!this.mapa || !this.capaMarcadores) return;

    const coords: L.LatLngExpression[] = [];

    paraderos.forEach((nodo, index) => {
      const lat = Number(nodo.latitud);
      const lng = Number(nodo.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      coords.push([lat, lng]);

      const esPrimero = index === 0;
      const esUltimo  = index === paraderos.length - 1;
      const icono     = esPrimero || esUltimo ? this.iconoTerminal : this.iconoParadero;

      L.marker([lat, lng], { icon: icono })
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:160px;">
             <strong style="color:#1d4ed8;">#${index + 1} ${nodo.nombre || 'Sin nombre'}</strong><br/>
             <span style="font-size:12px;color:#6b7280;">Tipo: ${nodo.tipo || '—'}</span><br/>
             <span style="font-size:11px;color:#9ca3af;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
           </div>`,
        )
        .addTo(this.capaMarcadores!);
    });

    if (coords.length > 1) {
      L.polyline(coords, {
        color:   '#1d4ed8',
        weight:  4,
        opacity: 0.85,
      }).addTo(this.capaMarcadores!);
    }

    if (coords.length > 0) {
      this.mapa.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }

  // ── Paraderos cercanos (GPS) ──────────────────────────────────────────────

  obtenerParaderosCercanos(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización por GPS.');
      return;
    }

    this.cargandoGps      = true;
    this.rutaSeleccionada = null;

    this.capaMarcadores?.clearLayers();
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.miLatitud  = position.coords.latitude;
          this.miLongitud = position.coords.longitude;

          const base: any[] = this.paraderos || [];

          if (base.length === 0) {
            console.warn('No se encontraron paraderos cargados desde la BD.');
          }

          this.paraderosCercanos = base
            .map((p: any) => ({
              ...p,
              distancia: this.calcularDistanciaMetros(
                this.miLatitud!,
                this.miLongitud!,
                Number(p.latitud)  || 0,
                Number(p.longitud) || 0,
              ),
            }))
            .sort((a, b) => a.distancia - b.distancia)
            .slice(0, 5);

          this.cargandoGps = false;

          this.ngZone.runOutsideAngular(() =>
            this.dibujarRadarGpsEnMapa(
              this.miLatitud!,
              this.miLongitud!,
              this.paraderosCercanos,
            ),
          );

          setTimeout(() => this.mapa?.invalidateSize(), 50);
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.cargandoGps = false;
          this.cdr.detectChanges();
          console.error('Error GPS:', error);
          alert(
            'No se pudo acceder a tu ubicación. Habilita los permisos de ubicación en tu navegador.',
          );
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private dibujarRadarGpsEnMapa(
    lat: number,
    lng: number,
    cercanos: any[],
  ): void {
    if (!this.mapa || !this.capaMarcadores) return;

    L.marker([lat, lng], { icon: this.iconoUsuario })
      .bindPopup('<strong>📍 Tú estás aquí</strong>')
      .addTo(this.capaMarcadores)
      .openPopup();

    const bounds: L.LatLngExpression[] = [[lat, lng]];

    cercanos.forEach((p, i) => {
      const pLat = Number(p.latitud);
      const pLng = Number(p.longitud);
      if (isNaN(pLat) || isNaN(pLng)) return;

      bounds.push([pLat, pLng]);

      const distanciaTexto =
        p.distancia >= 1000
          ? `${(p.distancia / 1000).toFixed(1)} km`
          : `${p.distancia} m`;

      const rutasTexto =
        p.rutasEnLasQueAparece?.length > 0
          ? p.rutasEnLasQueAparece
              .map((r: any) => `🚌 ${r?.ruta?.nombre}`)
              .join('<br/>')
          : '🚫 Sin rutas asignadas';

      L.polyline([[lat, lng], [pLat, pLng]], {
        color:     '#f59e0b',
        weight:    2,
        opacity:   0.55,
        dashArray: '6 6',
      }).addTo(this.capaMarcadores!);

      L.marker([pLat, pLng], { icon: this.iconoCercano })
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:170px;">
             <strong style="color:#d97706;">#${i + 1} ${p.nombre || 'Sin nombre'}</strong><br/>
             <span style="font-size:12px;color:#6b7280;">Tipo: ${p.tipo || '—'}</span><br/>
             <span style="font-size:13px;color:#dc2626;font-weight:700;">📏 ${distanciaTexto}</span>
             <hr style="margin:4px 0;border-color:#e5e7eb;"/>
             <span style="font-size:11px;color:#374151;">${rutasTexto}</span>
           </div>`,
        )
        .addTo(this.capaMarcadores!);
    });

    this.mapa.setView([lat, lng], 15);

    if (bounds.length > 1) {
      this.mapa.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }

  // ── Haversine ─────────────────────────────────────────────────────────────

  private calcularDistanciaMetros(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R        = 6371e3;
    const phi1     = (lat1 * Math.PI) / 180;
    const phi2     = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLam = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLam / 2) ** 2;

    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}