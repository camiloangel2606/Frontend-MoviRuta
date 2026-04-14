import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss']
})
export class AuthCallbackComponent implements OnInit {
  loading = true;
  error: string | null = null;
  message = 'Procesando autenticacion...';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const result = this.authService.handleOAuthCallback();

    if (result.token) {
      this.message = 'Autenticacion exitosa. Obteniendo datos...';

      forkJoin({
        profile: this.authService.getMe(),
        roles: this.authService.getMyRoles()
      }).subscribe({
        next: data => {
          if (data.profile?.user) {
            this.authService.setCurrentUser(data.profile.user);
          }

          this.message = 'Redirigiendo al dashboard...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: err => {
          SecurityLogger.warn('OAuth', 'No se pudieron cargar todos los datos posteriores al callback', err);
          this.message = 'Redirigiendo al dashboard...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        }
      });
    } else if (result.error) {
      this.error = `Error: ${result.error}`;
      this.message = 'Redirigiendo a login...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } else {
      this.error = 'No se encontro token de autenticacion';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }
}
