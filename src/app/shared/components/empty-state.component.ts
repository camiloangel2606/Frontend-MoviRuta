import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="empty-state" [class]="'empty-state--' + variant">
      <div class="empty-state__icon-wrapper">
        <mat-icon class="empty-state__icon">{{ icon }}</mat-icon>
      </div>
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      animation: fadeInUp 0.5s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .empty-state__icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(21, 101, 192, 0.1), rgba(66, 165, 245, 0.05));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      animation: float 4s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .empty-state__icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--color-primary);
    }

    .empty-state__title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    .empty-state__subtitle {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 280px;
      line-height: 1.5;
    }

    // Variants
    .empty-state--compact {
      padding: 32px 16px;

      .empty-state__icon-wrapper {
        width: 60px;
        height: 60px;
      }

      .empty-state__icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .empty-state__title {
        font-size: 16px;
      }
    }

    .empty-state--inline {
      flex-direction: row;
      gap: 16px;
      padding: 24px;
      text-align: left;

      .empty-state__icon-wrapper {
        width: 48px;
        height: 48px;
        margin-bottom: 0;
        animation: none;
      }

      .empty-state__icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    // Dark theme
    :host-context(.dark-theme) {
      .empty-state__icon-wrapper {
        background: linear-gradient(135deg, rgba(66, 165, 245, 0.15), rgba(66, 165, 245, 0.05));
      }
    }
  `]
})
export class EmptyStateComponent {
  /** Icono de Material Icons */
  @Input() icon: string = 'inbox';
  
  /** Título principal */
  @Input() title: string = 'No hay datos';
  
  /** Subtítulo o descripción */
  @Input() subtitle: string = '';
  
  /** Variante de estilo: 'default' | 'compact' | 'inline' */
  @Input() variant: 'default' | 'compact' | 'inline' = 'default';
}
