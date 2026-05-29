import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="prox-wrapper">
      <div class="prox-card">
        <mat-icon class="prox-icon">construction</mat-icon>
        <h2>{{ titulo }}</h2>
        <p>Esta sección está en construcción. Pronto estará disponible.</p>
        <a mat-stroked-button routerLink="/dashboard">Volver al dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .prox-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 24px;
    }
    .prox-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
      max-width: 400px;
    }
    .prox-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--app-support, #1775ff);
      opacity: 0.7;
    }
    h2 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 700;
    }
    p {
      margin: 0;
      opacity: 0.7;
    }
  `]
})
export class ProximamenteComponent implements OnInit {
  titulo = 'Próximamente';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.titulo = this.route.snapshot.data['titulo'] || 'Próximamente';
  }
}
