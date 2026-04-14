import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Profile, ChangePasswordRequest, ChangePasswordResponse } from '../../shared/models/user.model';
import { SecurityLogger } from '../utils/security-logger';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profileSubject = new BehaviorSubject<Profile | null>(null);
  public profile$ = this.profileSubject.asObservable();

  constructor(private api: ApiService) {}

  getCurrentProfile(): Profile | null {
    return this.profileSubject.getValue();
  }

  setProfile(profile: Profile | null): void {
    this.profileSubject.next(profile);
  }

  getMyProfile(): Observable<Profile> {
    return this.api.get<Profile>('/profiles/me').pipe(
      tap(profile => {
        this.profileSubject.next(profile);
      })
    );
  }

  createIfMissing(): Observable<Profile> {
    return this.api.get<Profile>('/profiles/create-if-missing').pipe(
      tap(profile => {
        this.profileSubject.next(profile);
      })
    );
  }

  updateProfile(phone?: string | null, photo?: string | null): Observable<Profile> {
    const hasPhone = phone && phone.trim();
    const hasPhoto = photo && photo.trim();

    if (!hasPhone && !hasPhoto) {
      return throwError(() => new Error('Debe proporcionar al menos un campo con valor para actualizar'));
    }

    return this.getMyProfile().pipe(
      switchMap((currentProfile: Profile) => {
        if (!currentProfile || !currentProfile.id) {
          return throwError(() => new Error('No se pudo obtener el perfil actual'));
        }

        localStorage.setItem('profileId', currentProfile.id);

        const updatedProfile = {
          id: currentProfile.id,
          phone: hasPhone ? phone!.trim() : currentProfile.phone,
          photo: hasPhoto ? photo!.trim() : currentProfile.photo
        };

        SecurityLogger.info('Profile', 'Actualizando perfil del usuario', {
          profileId: currentProfile.id,
          changes: {
            phone: hasPhone ? 'updated' : 'unchanged',
            photo: hasPhoto ? 'updated' : 'unchanged'
          }
        });

        return this.executeUpdate(currentProfile.id, updatedProfile);
      })
    );
  }

  private executeUpdate(profileId: string, profileData: any): Observable<Profile> {
    return this.api.put<Profile>(`/profiles/${profileId}`, profileData).pipe(
      tap(profile => {
        this.profileSubject.next(profile);
      })
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<ChangePasswordResponse> {
    const request: ChangePasswordRequest = {
      currentPassword,
      newPassword,
      confirmPassword
    };

    return this.api.post<ChangePasswordResponse>('/profiles/change-password', request);
  }

  static validatePhotoUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) return null;

    const trimmedUrl = url.trim();

    if (!trimmedUrl.toLowerCase().startsWith('https://')) {
      return 'La URL debe comenzar con https://';
    }

    if (trimmedUrl.length > 500) {
      return 'La URL es demasiado larga (maximo 500 caracteres)';
    }

    try {
      const parsedUrl = new URL(trimmedUrl);
      if (!parsedUrl.hostname || parsedUrl.hostname.length < 3) {
        return 'La URL no tiene un dominio valido';
      }
    } catch {
      return 'La URL no es valida';
    }

    const trustedDomains = [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'gravatar.com',
      'www.gravatar.com',
      'cloudinary.com',
      'res.cloudinary.com',
      'imgix.com',
      'i.imgur.com',
      'imgur.com',
      'cdn.discordapp.com',
      'media.discordapp.net',
      'pbs.twimg.com',
      'abs.twimg.com',
      'images.unsplash.com',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      's3.amazonaws.com'
    ];

    const hostname = new URL(trimmedUrl).hostname.toLowerCase();
    const isTrusted = trustedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isTrusted) {
      SecurityLogger.warn('Profile', 'URL de foto fuera de dominios comunes', { hostname });
    }

    return null;
  }
}
