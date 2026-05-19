import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanificacionService, Ruta, Paradero } from '../../core/services/planificacion.service';
import { ChangeDetectorRef } from '@angular/core';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.scss'
  })
export class RutasComponent implements OnInit {
  rutas: Ruta[] = [];
  rutasFiltradas: Ruta[] = [];
  paraderos: Paradero[] = [];
  paraderosCercanos: Paradero[] = [];
  
  rutaSeleccionada: Ruta | null = null;
  filtroTexto: string = '';
  
  loadingRutas = false;
  loadingGeoloc = false;
  gpsError: string | null = null;

  constructor(private planificacionService: PlanificacionService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loadingRutas = true;
    this.planificacionService.getRutas().subscribe({
      next: (data) => {
        this.rutas = data;
        this.rutasFiltradas = data;
        this.loadingRutas = false;
      },
      error: (err) => {
        console.error('Error al cargar rutas', err);
        this.loadingRutas = false;
      }
    });

    this.planificacionService.getParaderos().subscribe({
      next: (data) => this.paraderos = data,
      error: (err) => console.error('Error al cargar paraderos', err)
    });
  }

  filtrarRutas(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const busqueda = inputElement.value.toLowerCase().trim();
    
    if (!busqueda) {
      this.rutasFiltradas = this.rutas;
    } else {
      this.rutasFiltradas = this.rutas.filter(r => 
        r.nombre.toLowerCase().includes(busqueda) || 
        r.codigo?.toLowerCase().includes(busqueda)
      );
    }
  }

  seleccionarRuta(ruta: Ruta): void {
    this.loadingRutas = true;
    this.planificacionService.getRutaDetalle(ruta.id).subscribe({
      next: (res) => {
        this.rutaSeleccionada = res;
        this.loadingRutas = false;
        // Aquí puedes invocar la renderización de tu mapa de Leaflet/GoogleMaps pasándole res.paraderos
      },
      error: () => this.loadingRutas = false
    });
  }

  obtenerParaderosCercanos(): void {
    if (!navigator.geolocation) {
      this.gpsError = 'Tu navegador no soporta geolocalización.';
      return;
    }

    this.loadingGeoloc = true;
    this.gpsError = null;

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => { // 👈 Corregido: Tipo explícito añadido
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Mapeamos los paraderos calculando su distancia en línea recta usando Haversine
        const calculados = this.paraderos.map(p => {
          const dist = this.calcularDistanciaHaversine(userLat, userLng, Number(p.latitud), Number(p.longitud));
          return { ...p, distanciaClimatica: Math.round(dist * 1000) }; // Convertido a metros
        });

        // Ordenar de menor a mayor distancia y extraer los 5 más próximos (HU-ENTR-2-002)
        this.paraderosCercanos = calculados
          .sort((a, b) => (a.distanciaClimatica || 0) - (b.distanciaClimatica || 0))
          .slice(0, 5);

        this.loadingGeoloc = false;
      },
      (err: GeolocationPositionError) => { // 👈 Corregido: Tipo explícito añadido
        console.error('Error GPS', err);
        this.gpsError = 'No se pudo acceder a tu ubicación. Verifica los permisos.';
        this.loadingGeoloc = false;
      }
    );
  }

  // Algoritmo matemático para cálculo de proximidad geográfica en metros
  private calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la tierra en KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // 👈 Corregido el cierre del Math.atan2
    return R * c;
  }
}