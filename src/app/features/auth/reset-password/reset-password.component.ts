import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isLoading = false;
  isValidatingToken = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  resetSuccess = false;
  resetToken: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/profile']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'];

      if (!this.resetToken) {
        this.errorMessage = 'Token invalido o expirado. Solicita otro enlace de recuperacion.';
        this.isValidatingToken = false;
        return;
      }

      this.isValidatingToken = false;
      SecurityLogger.info('Recovery', 'Token de recuperacion recibido en la vista publica');
    });
  }

  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(group: FormGroup): {[key: string]: boolean} | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  get password() {
    return this.resetPasswordForm.get('password');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid || !this.resetToken) {
      this.errorMessage = 'Por favor completa el formulario correctamente';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      await this.auth.resetPassword(
        this.resetToken,
        this.password?.value
      ).toPromise();

      this.successMessage = 'Contrasena actualizada correctamente. Redirigiendo a login...';
      this.resetSuccess = true;
      this.resetPasswordForm.reset();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al actualizar contrasena. Intenta solicitar otro enlace.';
      SecurityLogger.error('Recovery', 'Fallo el restablecimiento de contrasena', error);
    } finally {
      this.isLoading = false;
    }
  }

  requestNewLink(): void {
    this.router.navigate(['/forgot-password']);
  }
}
