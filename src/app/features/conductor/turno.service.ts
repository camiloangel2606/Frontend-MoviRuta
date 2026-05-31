import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';

export interface Persona {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  securityUserId: string;
}

export interface Bus {
  id: number;
  placa: string;
  modelo: string;
  anio: number;
  capacidadMaxima: number;
  estado: string;
}

export interface Conductor {
  id: number;
  persona: Persona;
  licencia: string | null;
}

export interface Ruta {
  id: number;
  nombre: string;
  descripcion: string | null;
  tarifa: number;
}

export interface Programacion {
  id: number;
  ruta: Ruta;
  bus: Bus;
  conductorAsignado: Conductor;
  fecha: string;
  horaSalida: string;
  recurrente: string;
  estado: string;
}

export interface Turno {
  id: number;
  conductor: Conductor;
  bus: Bus;
  inicio: string;
  fin: string | null;
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO';
  observaciones: string | null;
}

export interface Gps {
  id: number;
  bus: Bus;
  deviceId: string;
  latitud: number | null;
  longitud: number | null;
}

export interface Incidente {
  id: number;
  bus: Bus;
  tipo: string;
  gravedad: string;
  descripcion: string;
  estado: string;
}

export interface CreateIncidenteDto {
  busId: number;
  reportadoPorId?: number;
  tipo: string;
  gravedad: string;
  descripcion: string;
  estado?: string;
  latitud?: number;
  longitud?: number;
}

@Injectable({ providedIn: 'root' })
export class TurnoService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getPersonaBySecurity(securityUserId: string): Observable<Persona> {
    return this.api.get<Persona>(`${this.base}/persona/security/${securityUserId}`);
  }

  getConductores(): Observable<Conductor[]> {
    return this.api.get<Conductor[]>(`${this.base}/conductor`);
  }

  getTurnosConductor(conductorId: number): Observable<Turno[]> {
    return this.api.get<Turno[]>(`${this.base}/turno/conductor/${conductorId}`);
  }

  getProgramaciones(): Observable<Programacion[]> {
    return this.api.get<Programacion[]>(`${this.base}/programacion`);
  }

  iniciarTurno(id: number, dto: { observaciones?: string }): Observable<Turno> {
    return this.api.post<Turno>(`${this.base}/turno/${id}/iniciar`, dto);
  }

  getGps(): Observable<Gps[]> {
    return this.api.get<Gps[]>(`${this.base}/gps`);
  }

  actualizarPosicion(gpsId: number, latitud: number, longitud: number): Observable<Gps> {
    return this.api.patch<Gps>(`${this.base}/gps/${gpsId}/posicion`, { latitud, longitud });
  }

  crearIncidente(dto: CreateIncidenteDto): Observable<Incidente> {
    return this.api.post<Incidente>(`${this.base}/incidente`, dto);
  }
}
