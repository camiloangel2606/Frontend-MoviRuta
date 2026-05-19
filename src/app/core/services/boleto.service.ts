import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Boleto, MetodoPagoCiudadano, CrearBoletoDto } from '../../shared/models/boletos.models';

@Injectable({
  providedIn: 'root'
})
export class BoletosService {
  // Ajusta el puerto base según la configuración de tu Backend local
  private apiUrl = 'http://localhost:3000'; 

  constructor(private http: HttpClient) {}

  // HU-ENTR-2-003: Obtener historial general de boletos
  getBoletos(): Observable<Boleto[]> {
    return this.http.get<Boleto[]>(`${this.apiUrl}/boleto`);
  }

  // Obtener métodos de pago del ciudadano
  getMetodosPago(): Observable<MetodoPagoCiudadano[]> {
    return this.http.get<MetodoPagoCiudadano[]>(`${this.apiUrl}/metodo-pago-ciudadano`);
  }

  // HU-ENTR-2-003: Registrar el abordaje en la base de datos
  crearBoleto(dto: any): Observable<Boleto> {
    return this.http.post<Boleto>(`${this.apiUrl}/boleto`, dto);
  }

  // HU-ENTR-2-004: Registrar descenso (actualizar estado a COMPLETADO)
  actualizarDescenso(id: number, data: any): Observable<Boleto> {
    return this.http.patch<Boleto>(`${this.apiUrl}/boleto/${id}`, data);
  }
}