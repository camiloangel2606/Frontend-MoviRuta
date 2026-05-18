import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Direccion } from '../../shared/models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class DireccionService {
  private baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getDirecciones(): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(`${this.baseUrl}/direccion`);
  }

  createDireccion(data: Direccion): Observable<Direccion> {
    return this.http.post<Direccion>(`${this.baseUrl}/direccion`, data);
  }
}
