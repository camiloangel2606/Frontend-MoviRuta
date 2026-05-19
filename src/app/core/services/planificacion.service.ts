import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Paradero {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  tipo: 'PARADERO' | 'INTERCAMBIADOR' | 'OTRO';
  distanciaClimatica?: number; // Para cálculos locales de cercanía (metros o km)
}

export interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tarifa: number;
  tiempoEstimadoTotal: number;
  paraderos?: Paradero[]; // Secuencia ordenada de paraderos
}

@Injectable({
  providedIn: 'root'
})
export class PlanificacionService {
  // Corregido usando 'negocioUrl' basado en tu error de compilación
  private readonly baseUrl = environment.negocioUrl; 

  constructor(private http: HttpClient) {}

  // HU-ENTR-2-001: Obtener el catálogo global de rutas
  getRutas(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.baseUrl}/ruta`);
  }

  // HU-ENTR-2-001: Obtener paraderos en orden secuencial asignados a una ruta
  getRutaDetalle(rutaId: number): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.baseUrl}/ruta/${rutaId}`);
  }

  // HU-ENTR-2-002: Obtener todos los paraderos físicos registrados en el negocio
  getParaderos(): Observable<Paradero[]> {
    return this.http.get<Paradero[]>(`${this.baseUrl}/paradero`);
  }
}