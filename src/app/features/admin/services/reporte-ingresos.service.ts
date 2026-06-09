import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export type RangoMeses = 3 | 6 | 12;

export interface SerieIngreso {
  metodoPago: string;
  data: number[];
}

export interface TotalMetodo {
  metodoPago: string;
  total: number;
  porcentaje: number;
}

export interface RangoIngreso {
  desde: string;
  hasta: string;
  meses: number;
}

export interface IngresosResponse {
  meses: string[];
  series: SerieIngreso[];
  totales: TotalMetodo[];
  totalGeneral: number;
  rango: RangoIngreso;
}

@Injectable({ providedIn: 'root' })
export class ReporteIngresosService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getIngresos(meses: RangoMeses): Observable<IngresosResponse> {
    return this.api.get<IngresosResponse>(
      `${this.base}/reportes/ingresos?meses=${meses}`,
    );
  }
}
