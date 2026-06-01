import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { Ruta } from './ruta.service';

export interface Bus {
  id: number;
  placa: string;
  modelo: string;
  anio: number;
  capacidadMaxima: number;
  estado: 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
  empresa?: { id: number; nombre: string };
}

export interface Conductor {
  id: number;
  licencia?: string;
  persona: {
    id: number;
    nombres: string;
    apellidos: string;
  };
}

export type RecurrenciaEnum = 'UNICA' | 'DIARIA' | 'LUNES_A_VIERNES' | 'FINES_DE_SEMANA';
export type EstadoProgramacion = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export interface Programacion {
  id: number;
  ruta: Ruta;
  bus: Bus;
  conductorAsignado?: Conductor;
  fecha: string;
  horaSalida: string;
  recurrente: RecurrenciaEnum;
  toleranciaMinutos: number;
  estado: EstadoProgramacion;
}

export interface CrearProgramacionDto {
  rutaId: number;
  busId: number;
  conductorId: number;
  fecha: string;
  horaSalida: string;
  recurrente?: RecurrenciaEnum;
  toleranciaMinutos?: number;
}

@Injectable({ providedIn: 'root' })
export class ProgramacionService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getProgramaciones(): Observable<Programacion[]> {
    return this.api.get<Programacion[]>(`${this.base}/programacion`);
  }

  getProgramacionesByBusYFecha(busId: number, fecha: string): Observable<Programacion[]> {
    return this.api.get<Programacion[]>(
      `${this.base}/programacion?busId=${busId}&fecha=${fecha}`,
    );
  }

  getProgramacionesByConductorYFecha(conductorId: number, fecha: string): Observable<Programacion[]> {
    return this.api.get<Programacion[]>(
      `${this.base}/programacion?conductorId=${conductorId}&fecha=${fecha}`,
    );
  }

  actualizarEstado(id: number, estado: string): Observable<Programacion> {
    return this.api.patch<Programacion>(`${this.base}/programacion/${id}`, { estado });
  }

  getBuses(): Observable<Bus[]> {
    return this.api.get<Bus[]>(`${this.base}/bus`);
  }

  getRutas(): Observable<Ruta[]> {
    return this.api.get<Ruta[]>(`${this.base}/ruta`);
  }

  getConductores(): Observable<Conductor[]> {
    return this.api.get<Conductor[]>(`${this.base}/conductor`);
  }

  crearProgramacion(dto: CrearProgramacionDto): Observable<Programacion> {
    return this.api.post<Programacion>(`${this.base}/programacion`, dto);
  }
}
