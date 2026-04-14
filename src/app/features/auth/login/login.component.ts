import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginResponse } from '../../../shared/models/auth.model';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  requires2FA = false;
  userEmail = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private recaptcha: RecaptchaService,
    private toast: ToastService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.toast.warning('Completa el formulario antes de continuar.');
      return;
    }

    this.isLoading = true;

    try {
      const recaptchaToken = await this.recaptcha.execute('login');
      const response = await firstValueFrom(
        this.auth.login(
          this.email?.value,
          this.password?.value,
          recaptchaToken
        )
      ) as LoginResponse;

      if (response.requires2FA) {
        sessionStorage.setItem('2fa_email', response.email);
        this.userEmail = response.email;
        this.requires2FA = true;
        this.toast.info('Te enviamos un codigo de verificacion al correo registrado.');
        this.loginForm.reset();
        SecurityLogger.info('Login', 'Usuario redirigido al flujo 2FA');

        setTimeout(() => {
          this.router.navigate(['/verify-2fa'], {
            state: { email: this.userEmail }
          });
        }, 2500);
        return;
      }

      this.loginForm.reset();
      this.toast.success('Acceso concedido. Cargando tu entorno de trabajo.');
      SecurityLogger.info('Login', 'Cargando perfil y roles del usuario');

      forkJoin({
        profile: this.auth.getMe(),
        roles: this.auth.getMyRoles()
      }).subscribe({
        next: data => {
          if (data.profile?.user) {
            this.auth.setCurrentUser(data.profile.user);
          }

          SecurityLogger.info('Login', 'Perfil y roles cargados');
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          SecurityLogger.warn('Login', 'No se pudieron cargar todos los datos posteriores al login', err);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        }
      });
    } catch (error: any) {
      SecurityLogger.error('Login', 'Fallo el inicio de sesion', error);
    } finally {
      this.isLoading = false;
    }
  }

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }

  loginWithGitHub(): void {
    this.auth.loginWithGitHub();
  }

  loginWithMicrosoft(): void {
    this.auth.loginWithMicrosoft();
  }
}
