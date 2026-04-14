import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnDestroy, OnChanges {
  /** Valor final al que animar */
  @Input('appCountUp') endValue: number = 0;
  
  /** Duración de la animación en ms */
  @Input() duration: number = 1000;
  
  /** Retraso antes de iniciar en ms */
  @Input() countDelay: number = 0;
  
  /** Prefijo (ej: '$') */
  @Input() prefix: string = '';
  
  /** Sufijo (ej: '%') */
  @Input() suffix: string = '';

  private animationFrame: number | null = null;
  private startTime: number | null = null;
  private observer: IntersectionObserver | null = null;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private isVisible = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // Iniciar con 0
    this.el.nativeElement.textContent = this.prefix + '0' + this.suffix;
    
    // Usar IntersectionObserver para animar solo cuando sea visible
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.isVisible = true;
            this.scheduleAnimation();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['endValue'] && !changes['endValue'].firstChange && this.isVisible) {
      this.scheduleAnimation();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private scheduleAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
    }

    this.startTime = null;
    this.delayTimer = setTimeout(() => this.animate(), this.countDelay);
  }

  private animate(): void {
    const startValue = 0;
    const endValue = Number(this.endValue) || 0;
    
    if (endValue === 0) {
      this.el.nativeElement.textContent = this.prefix + '0' + this.suffix;
      return;
    }

    const step = (timestamp: number) => {
      if (!this.startTime) {
        this.startTime = timestamp;
      }

      const progress = Math.min((timestamp - this.startTime) / this.duration, 1);
      
      // Easing function: easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress);
      
      this.el.nativeElement.textContent = this.prefix + currentValue + this.suffix;

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(step);
      } else {
        // Asegurar valor final exacto
        this.el.nativeElement.textContent = this.prefix + endValue + this.suffix;
      }
    };

    this.animationFrame = requestAnimationFrame(step);
  }
}
