import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface RangoDemografia {
  rango: string;
  cantidad: number;
  porcentaje: number;
  variacionVsMesAnterior: number;
}

export interface DemografiaResponse {
  rangos: RangoDemografia[];
  totalPasajeros: number;
  rango: {
    desde: string;
    hasta: string;
    rutaId: number | null;
  };
}

export interface DemografiaFiltros {
  rutaId?: number | null;
  fechaInicio?: string;
  fechaFin?: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteDemografiaService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getDemografia(filtros: DemografiaFiltros): Observable<DemografiaResponse> {
    const params: string[] = [];
    if (filtros.rutaId != null) params.push(`rutaId=${filtros.rutaId}`);
    if (filtros.fechaInicio) params.push(`fechaInicio=${filtros.fechaInicio}`);
    if (filtros.fechaFin) params.push(`fechaFin=${filtros.fechaFin}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.api.get<DemografiaResponse>(`${this.base}/reportes/demografia${qs}`);
  }
}
