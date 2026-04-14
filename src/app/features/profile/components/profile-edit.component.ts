import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Profile } from '../../../shared/models/user.model';
import { SecurityLogger } from '../../../core/utils/security-logger';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss'
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  success = '';

  private destroy$ = new Subject<void>();

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      phone: [''],
      photo: ['']
    });
  }

  ngOnInit() {
    const token = localStorage.getItem('jwt');
    if (!token) {
      this.error = 'Sesion expirada. Por favor inicia sesion nuevamente.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.error = '';

    this.profileService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile: Profile) => {
          if (profile?.id) {
            localStorage.setItem('profileId', profile.id);
          }

          if (profile?.user) {
            this.authService.setCurrentUser(profile.user);
          }

          this.form.patchValue({
            phone: profile.phone || '',
            photo: profile.photo || ''
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Error al cargar perfil. Por favor recarga la pagina.';
          this.loading = false;
          SecurityLogger.warn('Profile', 'No se pudo cargar el formulario de perfil', err);
        }
      });
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    const phone = (this.form.get('phone')?.value || '').trim();
    const photo = (this.form.get('photo')?.value || '').trim();

    if (!phone && !photo) {
      this.error = 'Debe proporcionar al menos un campo para actualizar';
      return;
    }

    this.saving = true;

    this.profileService.updateProfile(phone || null, photo || null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Perfil actualizado correctamente';
          this.saving = false;

          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err: any) => {
          this.saving = false;
          this.error = err?.message || 'Error desconocido';
          SecurityLogger.warn('Profile', 'No se pudo actualizar el perfil', err);
        }
      });
  }

  onPhotoPreviewError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (image) {
      image.style.display = 'none';
    }
  }

  onPhotoPreviewLoad(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (image) {
      image.style.display = 'block';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}