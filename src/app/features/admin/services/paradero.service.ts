import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { Paradero } from './ruta.service';

export type { Paradero };

export interface CrearParaderoDto {
  nombre: string;
  latitud: number;
  longitud: number;
  tipo: 'PARADERO' | 'ESTACION' | 'TERMINAL';
}

@Injectable({ providedIn: 'root' })
export class ParaderoService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getParaderos(): Observable<Paradero[]> {
    return this.api.get<Paradero[]>(`${this.base}/paradero`);
  }

  crearParadero(dto: CrearParaderoDto): Observable<Paradero> {
    return this.api.post<Paradero>(`${this.base}/paradero`, dto);
  }
}
