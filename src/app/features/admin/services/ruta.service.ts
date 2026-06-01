import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface Ruta {
  id: number;
  nombre: string;
  descripcion?: string;
  tarifa: number;
}

export interface Paradero {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  tipo: 'PARADERO' | 'ESTACION' | 'TERMINAL';
}

export interface ParaderoEnRuta {
  id: number;
  orden: number;
  paradero: Paradero;
  distanciaDesdeAnterior?: number;
  tiempoEstimadoDesdeAnterior?: number;
}

export interface CrearRutaDto {
  nombre: string;
  descripcion?: string;
  tarifa: number;
  paraderos: Array<{
    paraderoId: number;
    orden: number;
    distanciaDesdeAnterior?: number;
    tiempoEstimadoDesdeAnterior?: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class RutaService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getRutas(): Observable<Ruta[]> {
    return this.api.get<Ruta[]>(`${this.base}/ruta`);
  }

  getParaderos(): Observable<Paradero[]> {
    return this.api.get<Paradero[]>(`${this.base}/paradero`);
  }

  getParaderosDeRuta(rutaId: number): Observable<ParaderoEnRuta[]> {
    return this.api.get<ParaderoEnRuta[]>(`${this.base}/ruta/${rutaId}/paraderos`);
  }

  crearRutaConParaderos(dto: CrearRutaDto): Observable<Ruta> {
    return this.api.post<Ruta>(`${this.base}/ruta/con-paraderos`, dto);
  }
}
