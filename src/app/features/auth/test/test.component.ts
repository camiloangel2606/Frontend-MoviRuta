import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="test-container">
      <mat-card class="test-card">
        <mat-card-title>Test de Conexion</mat-card-title>
        <mat-card-content>
          <p>Backend URL: <code>http://localhost:5050/api/public/security/test</code></p>

          <button mat-raised-button color="primary" (click)="testBackend()">
            {{ isLoading ? 'Probando...' : 'Probar conexion' }}
          </button>

          <mat-spinner *ngIf="isLoading" diameter="30"></mat-spinner>

          <div *ngIf="response" class="response">
            <h3 style="color: #4caf50;">Conectado</h3>
            <pre>{{ response | json }}</pre>
          </div>

          <div *ngIf="error" class="error">
            <h3 style="color: #f44336;">Error</h3>
            <pre>{{ error }}</pre>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .test-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);
      padding: 1rem;
    }

    .test-card {
      max-width: 500px;
      width: 100%;
      padding: 2rem;
    }

    mat-card-title {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    code {
      background-color: #f5f5f5;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }

    button {
      margin-top: 1rem;
      width: 100%;
    }

    .response, .error {
      margin-top: 2rem;
      padding: 1rem;
      border-radius: 8px;
      background-color: #f5f5f5;
      overflow-x: auto;
    }

    pre {
      margin: 0;
      font-size: 0.875rem;
      font-family: 'Courier New', monospace;
    }

    mat-spinner {
      margin: 2rem auto;
    }
  `]
})
export class TestComponent implements OnInit {
  response: any;
  error: string | null = null;
  isLoading = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.testBackend();
  }

  testBackend() {
    this.isLoading = true;
    this.response = null;
    this.error = null;

    this.http.get('http://localhost:5050/api/public/security/test')
      .subscribe({
        next: data => {
          this.response = data;
          this.isLoading = false;
          SecurityLogger.info('Test', 'Conexion con backend de seguridad exitosa');
        },
        error: err => {
          this.error = err.message || 'No se pudo conectar al backend';
          this.isLoading = false;
          SecurityLogger.error('Test', 'Fallo la conexion con el backend de seguridad', err);
        }
      });
  }
}
