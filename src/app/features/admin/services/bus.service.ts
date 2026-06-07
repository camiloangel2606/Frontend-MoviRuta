import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface Empresa {
  id: number;
  nombre: string;
  nit?: string;
}

export interface Bus {
  id: number;
  placa: string;
  modelo: string;
  anio: number;
  capacidadMaxima: number;
  estado: 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
  empresa?: Empresa;
}

export interface CrearBusDto {
  placa: string;
  modelo: string;
  anio: number;
  capacidadMaxima: number;
  empresaId: number;
  estado?: 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
}

export interface ActualizarBusDto {
  placa?: string;
  modelo?: string;
  anio?: number;
  capacidadMaxima?: number;
  empresaId?: number;
  estado?: 'OPERATIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
}

@Injectable({ providedIn: 'root' })
export class BusService {
  private readonly base = (environment as any).negocioUrl ?? 'http://localhost:3000';

  constructor(private api: ApiService) {}

  getBuses(): Observable<Bus[]> {
    return this.api.get<Bus[]>(`${this.base}/bus`);
  }

  crearBus(dto: CrearBusDto): Observable<Bus> {
    return this.api.post<Bus>(`${this.base}/bus`, dto);
  }

  actualizarBus(id: number, dto: ActualizarBusDto): Observable<Bus> {
    return this.api.patch<Bus>(`${this.base}/bus/${id}`, dto);
  }

  eliminarBus(id: number): Observable<void> {
    return this.api.delete<void>(`${this.base}/bus/${id}`);
  }

  getEmpresas(): Observable<Empresa[]> {
    return this.api.get<Empresa[]>(`${this.base}/empresa`);
  }
}
