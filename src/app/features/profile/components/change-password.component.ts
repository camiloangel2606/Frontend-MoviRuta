import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  saving = false;
  loading = true;
  error = '';
  success = '';
  isLocalUser = false;
  currentUser: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    this.loading = true;
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser) {
      this.determineUserType();
      this.loading = false;
      return;
    }

    const userJson = localStorage.getItem('current_user');
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
        this.determineUserType();
        this.loading = false;
        return;
      } catch (error) {
        SecurityLogger.warn('Profile', 'No se pudo leer el usuario desde almacenamiento local', error);
      }
    }

    this.profileService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: profile => {
          if (profile?.user) {
            this.currentUser = profile.user;
            this.authService.setCurrentUser(profile.user);
          }
          this.determineUserType();
          this.loading = false;
        },
        error: err => {
          SecurityLogger.warn('Profile', 'No se pudo resolver el usuario actual para cambio de contrasena', err);
          this.error = 'No se pudo cargar la informacion del usuario';
          this.loading = false;
        }
      });
  }

  private determineUserType(): void {
    const authProvider = this.currentUser?.authProvider;

    if (authProvider === null || authProvider === undefined) {
      this.isLocalUser = true;
    } else {
      this.isLocalUser = authProvider.toUpperCase() === 'LOCAL';
    }
  }

  validatePasswordMatch() {
    const newPass = this.form.get('newPassword')?.value;
    const confirmPass = this.form.get('confirmPassword')?.value;

    if (newPass && confirmPass && newPass !== confirmPass) {
      this.form.get('confirmPassword')?.setErrors({ noMatch: true });
    } else if (newPass === confirmPass) {
      this.form.get('confirmPassword')?.setErrors(null);
    }
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    if (!this.isLocalUser) {
      this.error = 'No puedes cambiar contrasena en cuentas ' + (this.currentUser?.authProvider || 'OAuth');
      return;
    }

    const newPass = this.form.get('newPassword')?.value;
    const confirmPass = this.form.get('confirmPassword')?.value;

    if (newPass !== confirmPass) {
      this.error = 'Las nuevas contrasenas no coinciden';
      return;
    }

    if (newPass.length < 6) {
      this.error = 'La contrasena debe tener al menos 6 caracteres';
      return;
    }

    this.saving = true;
    const currentPassword = this.form.get('currentPassword')?.value;

    this.profileService.changePassword(currentPassword, newPass, confirmPass)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Contrasena actualizada correctamente';
          this.form.reset();
          this.saving = false;

          setTimeout(() => {
            this.success = '';
          }, 4000);
        },
        error: (err: any) => {
          this.saving = false;
          const errorMsg = err.message || 'Error desconocido';

          if (errorMsg.includes('cuentas null')) {
            this.error = 'Error de configuracion de cuenta. Contacta al administrador.';
            SecurityLogger.warn('Profile', 'El backend devolvio un authProvider invalido al cambiar contrasena');
          } else if (errorMsg.includes('contrasena actual') || errorMsg.includes('incorrecta')) {
            this.error = 'La contrasena actual es incorrecta';
          } else {
            this.error = 'Error: ' + errorMsg;
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
