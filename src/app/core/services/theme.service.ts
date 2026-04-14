import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.darkMode.asObservable();

  constructor() {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      this.setDarkMode(saved === 'true');
    }
  }

  toggleTheme(): void {
    this.setDarkMode(!this.darkMode.value);
  }

  setDarkMode(isDark: boolean): void {
    this.darkMode.next(isDark);
    localStorage.setItem('darkMode', String(isDark));

    // Aplicar clase al body
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  get isDark(): boolean {
    return this.darkMode.value;
  }
}
