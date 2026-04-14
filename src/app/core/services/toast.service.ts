import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.open(message, 'success');
  }

  error(message: string): void {
    this.open(message, 'error');
  }

  warning(message: string): void {
    this.open(message, 'warning');
  }

  info(message: string): void {
    this.open(message, 'info');
  }

  private open(message: string, type: ToastType): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`app-snackbar`, `app-snackbar-${type}`]
    });
  }
}
