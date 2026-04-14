import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-verify-two-factor',
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
  templateUrl: './verify-two-factor.component.html',
  styleUrls: ['./verify-two-factor.component.scss']
})
export class VerifyTwoFactorComponent implements OnInit, OnDestroy {
  verifyForm!: FormGroup;
  isLoading = false;
  userEmail: string | null = null;
  timeRemaining = 600;
  formattedTime = '10:00';
  isExpired = false;
  private timerInterval: any;
  resendCooldown = 0;
  private resendInterval: any;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private toast: ToastService,
    private recaptcha: RecaptchaService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.userEmail = history.state?.email || sessionStorage.getItem('2fa_email');

    if (!this.userEmail) {
      SecurityLogger.warn('2FA', 'Acceso invalido al formulario de verificacion');
      this.router.navigate(['/login']);
      return;
    }

    sessionStorage.setItem('2fa_email', this.userEmail);
    this.restoreSessionData();

    if (!this.isExpired) {
      this.startTimer();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  private initializeForm(): void {
    this.verifyForm = this.fb.group({
      digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit4: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit5: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit6: ['', [Validators.required, Validators.pattern('[0-9]')]]
    });
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && !/[0-9]/.test(value)) {
      input.value = '';
      return;
    }

    if (value && index < 5) {
      const nextInput = document.getElementById(`digit${index + 2}`) as HTMLInputElement;
      nextInput?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';
    const digits = pastedText.replace(/[^0-9]/g, '').slice(0, 6);

    if (digits.length === 6) {
      for (let i = 0; i < 6; i++) {
        this.verifyForm.get(`digit${i + 1}`)?.setValue(digits[i]);
      }

      const lastInput = document.getElementById('digit6') as HTMLInputElement;
      lastInput?.focus();
    }
  }

  private getFullCode(): string {
    return [1, 2, 3, 4, 5, 6]
      .map(i => this.verifyForm.get(`digit${i}`)?.value || '')
      .join('');
  }

  async onSubmit(): Promise<void> {
    if (this.verifyForm.invalid) {
      this.toast.warning('Ingresa los 6 digitos del codigo para continuar.');
      return;
    }

    if (this.isExpired) {
      this.toast.warning('El codigo expiro. Solicita uno nuevo para continuar.');
      return;
    }

    const email = this.userEmail || sessionStorage.getItem('2fa_email');
    if (!email) {
      this.toast.error('No se encontro el correo asociado. Inicia sesion nuevamente.');
      return;
    }

    this.isLoading = true;

    try {
      const code = this.getFullCode();
      await firstValueFrom(this.auth.verify2fa(email, code));

      this.toast.success('Identidad verificada. Cargando tu sesion.');
      this.verifyForm.reset();
      sessionStorage.removeItem('2fa_start_time');
      sessionStorage.removeItem('2fa_email');
      SecurityLogger.info('2FA', 'Codigo validado, cargando perfil y roles');

      forkJoin({
        profile: this.auth.getMe(),
        roles: this.auth.getMyRoles()
      }).subscribe({
        next: data => {
          if (data.profile?.user) {
            this.auth.setCurrentUser(data.profile.user);
          }

          SecurityLogger.info('2FA', 'Perfil y roles cargados');
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          SecurityLogger.warn('2FA', 'No se pudieron cargar todos los datos posteriores a la verificacion', err);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        }
      });
    } catch (error: any) {
      SecurityLogger.error('2FA', 'Fallo la verificacion del codigo', error);
      this.verifyForm.reset();
      const firstInput = document.getElementById('digit1') as HTMLInputElement;
      firstInput?.focus();
    } finally {
      this.isLoading = false;
    }
  }

  async onResendCode(): Promise<void> {
    if (this.resendCooldown > 0 || !this.userEmail) {
      return;
    }

    this.isLoading = true;

    try {
      const recaptchaToken = await this.recaptcha.execute('resend_2fa');
      await firstValueFrom(this.auth.resend2fa(this.userEmail, recaptchaToken));

      // ✅ CLAVE: reiniciar start_time para que el nuevo código no aparezca vencido
      sessionStorage.setItem('2fa_start_time', Date.now().toString());
      sessionStorage.setItem('2fa_email', this.userEmail);

      this.toast.info('Te enviamos un nuevo codigo de verificacion.');
      this.verifyForm.reset();
      this.timeRemaining = 600;
      this.isExpired = false;
      this.verifyForm.enable();

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      this.startTimer();
      this.startResendCooldown();
      SecurityLogger.info('2FA', 'Codigo reenviado');

      const firstInput = document.getElementById('digit1') as HTMLInputElement;
      firstInput?.focus();
    } catch (error: any) {
      SecurityLogger.error('2FA', 'Fallo el reenvio del codigo', error);
      this.toast.error('No se pudo reenviar el codigo. Intenta nuevamente.');
    } finally {
      this.isLoading = false;
    }
  }

  private startTimer(): void {
    const savedStartTime = sessionStorage.getItem('2fa_start_time');
    if (savedStartTime) {
      const elapsed = Math.floor((Date.now() - parseInt(savedStartTime, 10)) / 1000);
      this.timeRemaining = Math.max(600 - elapsed, 0);
    } else {
      sessionStorage.setItem('2fa_start_time', Date.now().toString());
      sessionStorage.setItem('2fa_email', this.userEmail!);
    }

    this.formattedTime = this.formatTime(this.timeRemaining);
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.formattedTime = this.formatTime(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.isExpired = true;
        this.verifyForm.disable();
        this.toast.warning('El codigo 2FA expiro. Solicita uno nuevo.');
        SecurityLogger.warn('2FA', 'El codigo expiro');
      }
    }, 1000);
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;

    this.resendInterval = setInterval(() => {
      this.resendCooldown--;

      if (this.resendCooldown <= 0) {
        clearInterval(this.resendInterval);
        this.resendCooldown = 0;
      }
    }, 1000);
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private restoreSessionData(): void {
    const savedStartTime = sessionStorage.getItem('2fa_start_time');
    if (!savedStartTime) {
      return;
    }

    const elapsed = Math.floor((Date.now() - parseInt(savedStartTime, 10)) / 1000);
    if (elapsed >= 600) {
      this.isExpired = true;
      this.formattedTime = '0:00';
      this.verifyForm.disable();
    }
  }
}