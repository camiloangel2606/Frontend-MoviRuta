import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface EmpresaTendencia {
  id: number;
  nombre: string;
}

export interface BusTendencia {
  id: number;
  placa: string;
  empresa: { id: number; nombre: string } | null;
}

export interface IncidenteTendencia {
  id: number;
  tipo: string;
  bus: { id: number } | null;
  createdAt: string;
}

interface PaginadoIncidente {
  data: IncidenteTendencia[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ReporteTendenciaIncidentesService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getEmpresas(): Observable<EmpresaTendencia[]> {
    return this.api.get<EmpresaTendencia[]>(`${this.base}/empresa`);
  }

  getBuses(): Observable<BusTendencia[]> {
    return this.api.get<BusTendencia[]>(`${this.base}/bus`);
  }

  getTodosIncidentes(): Observable<IncidenteTendencia[]> {
    return this.api.get<PaginadoIncidente>(`${this.base}/incidente?limit=50&page=1`).pipe(
      switchMap(primera => {
        if (primera.total === 0) return of([]);
        const totalPaginas = Math.ceil(primera.total / 50);
        if (totalPaginas <= 1) return of(primera.data);

        const restantes$ = Array.from({ length: totalPaginas - 1 }, (_, i) =>
          this.api.get<PaginadoIncidente>(`${this.base}/incidente?limit=50&page=${i + 2}`)
        );
        return forkJoin(restantes$).pipe(
          map(paginas => [...primera.data, ...paginas.flatMap(p => p.data)])
        );
      })
    );
  }
}
