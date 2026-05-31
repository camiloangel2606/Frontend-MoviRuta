import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface IncidenteDetalle {
  id: number;
  bus: { id: number; placa: string; modelo: string; };
  reportadoPor: { id: number; nombres: string; apellidos: string; } | null;
  tipo: 'MECANICO' | 'ACCIDENTE' | 'ELECTRICO' | 'OTRO';
  gravedad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  descripcion: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTO';
  latitud: number | null;
  longitud: number | null;
  createdAt?: string;
}

export interface FotoIncidente {
  id: number;
  incidente: { id: number };
  url: string;
}

@Injectable({ providedIn: 'root' })
export class IncidenteBusService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getIncidentes(): Observable<IncidenteDetalle[]> {
    return this.api.get<IncidenteDetalle[]>(`${this.base}/incidente`);
  }

  actualizarEstado(id: number, estado: string): Observable<IncidenteDetalle> {
    return this.api.patch<IncidenteDetalle>(`${this.base}/incidente/${id}`, { estado });
  }

  getFotos(): Observable<FotoIncidente[]> {
    return this.api.get<FotoIncidente[]>(`${this.base}/foto`);
  }
}
