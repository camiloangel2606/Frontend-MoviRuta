import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  strengthPercent = 0;
  strengthText = 'Debil';
  hasMinLength = false;
  hasUppercase = false;
  hasLowercase = false;
  hasNumber = false;
  hasSpecialChar = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
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
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordStrengthValidator(control: any): {[key: string]: boolean} | null {
    const password = control.value;
    if (!password) return null;

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;

    const isValid = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength;
    return isValid ? null : { weakPassword: true };
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

  onPasswordInput(): void {
    const password = this.password?.value || '';

    this.hasMinLength = password.length >= 8;
    this.hasUppercase = /[A-Z]/.test(password);
    this.hasLowercase = /[a-z]/.test(password);
    this.hasNumber = /[0-9]/.test(password);
    this.hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let strength = 0;
    if (this.hasMinLength) strength++;
    if (this.hasUppercase) strength++;
    if (this.hasLowercase) strength++;
    if (this.hasNumber) strength++;
    if (this.hasSpecialChar) strength++;

    if (strength <= 2) {
      this.passwordStrength = 'weak';
      this.strengthText = 'Debil';
      this.strengthPercent = 33;
    } else if (strength <= 4) {
      this.passwordStrength = 'medium';
      this.strengthText = 'Media';
      this.strengthPercent = 66;
    } else {
      this.passwordStrength = 'strong';
      this.strengthText = 'Fuerte';
      this.strengthPercent = 100;
    }
  }

  get name() {
    return this.registerForm.get('name');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor completa el formulario correctamente';
      return;
    }

    if (this.passwordStrength === 'weak') {
      this.errorMessage = 'La contrasena es muy debil. Agrega mayusculas, numeros y caracteres especiales.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      await this.auth.register(
        this.name?.value,
        this.email?.value,
        this.password?.value
      ).toPromise();

      this.successMessage = 'Registro exitoso. Redirigiendo a login...';
      this.registerForm.reset();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al registrar';
      SecurityLogger.error('Register', 'Fallo el registro de usuario', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
