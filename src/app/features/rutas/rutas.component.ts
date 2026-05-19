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
  paraderosCercanos: any[] = [];
  
  rutaSeleccionada: Ruta | null = null;
  tiempoEstimadoTotal: number = 0;
  paraderosMapa: any[] = [];
  filtroTexto: string = '';
  miLatitud: number | null = null;
  miLongitud: number | null = null;
  cargandoGps: boolean = false;
  
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

  seleccionarRuta(ruta: any): void {
    if (!ruta) return;

    this.rutaSeleccionada = ruta;
    this.paraderosCercanos = []; // Limpiamos el radar GPS

    if (ruta.paraderosEnRuta && Array.isArray(ruta.paraderosEnRuta) && ruta.paraderosEnRuta.length > 0) {
      // 1. Mapeamos los paraderos de manera segura
      this.paraderosMapa = ruta.paraderosEnRuta.map((item: any) => {
        return {
          id: item?.paradero?.id,
          nombre: item?.paradero?.nombre,
          latitud: item?.paradero?.latitud,
          longitud: item?.paradero?.longitud,
          tipo: item?.paradero?.tipo,
          orden: item?.orden
        };
      });

      // 2. ⚡ CALCULAMOS EL TIEMPO TOTAL SUMANDO LOS MINUTOS DEL JSON REAL
      this.tiempoEstimadoTotal = ruta.paraderosEnRuta.reduce((acc: number, item: any) => {
        const minutos = Number(item?.tiempoEstimadoDesdeAnterior) || 0;
        return acc + minutos;
      }, 0);

    } else {
      this.paraderosMapa = [];
      this.tiempoEstimadoTotal = 0;
    }

    // Forzamos el rediseño inmediato en pantalla
    this.cdr.detectChanges(); 
  }

  obtenerParaderosCercanos(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización por GPS.');
      return;
    }

    this.cargandoGps = true;
    this.rutaSeleccionada = null; // Cerramos el itinerario de rutas para abrir el radar GPS
    this.cdr.detectChanges();

    // 1. El sistema solicita permiso oficial al ciudadano para acceder al GPS
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.miLatitud = position.coords.latitude;
        this.miLongitud = position.coords.longitude;
        
        // 2. Procesamos los paraderos reales que ya cargó tu componente desde la BD
        // Nota: Si tu variable global de paraderos tiene otro nombre (ej. this.listaParaderos), cámbiala aquí:
        const paraderosRealesBD = (this as any).paraderos || [];

        if (paraderosRealesBD.length === 0) {
          console.warn("No se encontraron paraderos cargados desde la base de datos.");
        }

        // 3. Calculamos la distancia exacta en metros para cada paradero real
        const mapeadosConDistancia = paraderosRealesBD.map((p: any) => {
          // Usamos la fórmula matemática de Haversine
          const metros = this.calcularDistanciaMetros(
            this.miLatitud!,
            this.miLongitud!,
            Number(p.latitud) || 0,
            Number(p.longitud) || 0
          );
          return { ...p, distancia: metros };
        });

        // 4. CRITERIO DE ACEPTACIÓN: Ordenamos de menor a mayor distancia y tomamos los 5 más cercanos
        this.paraderosCercanos = mapeadosConDistancia
          .sort((a: any, b: any) => a.distancia - b.distancia)
          .slice(0, 5);

        this.cargandoGps = false;
        this.cdr.detectChanges(); // Refrescamos el radar y las tarjetas en el HTML
      },
      (error) => {
        this.cargandoGps = false;
        this.cdr.detectChanges();
        console.error('Error de permisos o lectura del GPS:', error);
        alert('No se pudo acceder a tu ubicación. Por favor, habilita los permisos de ubicación en tu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // 📏 FÓRMULA MATEMÁTICA HAVERSINE (Añádela abajo de obtenerParaderosCercanos si no la tienes)
  private calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Retorna metros enteros
  }
}