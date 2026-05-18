import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MetodoPago } from '../../shared/models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class MetodoPagoService {
  private baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${this.baseUrl}/metodo-pago`);
  }

  createMetodoPago(data: MetodoPago): Observable<MetodoPago> {
    return this.http.post<MetodoPago>(`${this.baseUrl}/metodo-pago`, data);
  }
}
