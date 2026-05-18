import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const token = this.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Modificado: Si el endpoint ya es una URL completa (http...), la usa directamente
  private buildUrl(endpoint: string): string {
    return endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint), { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  post<T>(endpoint: string, body: any = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body, { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  put<T>(endpoint: string, body: any = {}): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body, { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // NUEVO MÉTODO: Agregado el soporte para PATCH que requería el DTO de Ciudadano
  patch<T>(endpoint: string, body: any = {}): Observable<T> {
    return this.http.patch<T>(this.buildUrl(endpoint), body, { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint), { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      const serverMessage = error.error?.message || error.error?.error || error.statusText;
      errorMessage = `Error ${error.status}: ${serverMessage}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}