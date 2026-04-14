import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { ToastService } from '../../../core/services/toast.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  emailSent = false;

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
      this.router.navigate(['/profile']);
    }
  }

  private initializeForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      this.toast.warning('Ingresa un correo valido para continuar.');
      return;
    }

    this.isLoading = true;

    try {
      const recaptchaToken = await this.recaptcha.execute('forgot_password');
      await firstValueFrom(this.auth.forgotPassword(this.email?.value, recaptchaToken));

      this.emailSent = true;
      this.forgotPasswordForm.reset();
      this.toast.success('Te enviamos un enlace de recuperacion. Revisa tu correo.');
      SecurityLogger.info('Recovery', 'Solicitud de recuperacion completada');

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 4000);
    } catch (error: any) {
      SecurityLogger.error('Recovery', 'Fallo la solicitud de recuperacion', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
