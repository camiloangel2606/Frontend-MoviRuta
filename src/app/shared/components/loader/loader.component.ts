import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class SkeletonLoaderComponent {
  /**
   * Tipo de skeleton:
   * - 'text': Línea de texto
   * - 'circle': Avatar circular
   * - 'card': Card completa
   * - 'stat': Stat card del dashboard
   * - 'action': Action card del dashboard
   */
  @Input() type: 'text' | 'circle' | 'card' | 'stat' | 'action' = 'text';
  
  /** Ancho personalizado (ej: '100px', '50%') */
  @Input() width: string = '100%';
  
  /** Alto personalizado (ej: '20px') */
  @Input() height: string = '16px';
  
  /** Número de líneas para type='text' */
  @Input() lines: number = 1;
  
  /** Retraso en la animación para efecto stagger (en segundos) */
  @Input() delay: number = 0;

  get linesArray(): number[] {
    return Array(this.lines).fill(0).map((_, i) => i);
  }

  getLineWidth(index: number): string {
    // Última línea más corta para efecto natural
    if (index === this.lines - 1 && this.lines > 1) {
      return '70%';
    }
    return this.width;
  }
}
