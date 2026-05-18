import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Profile, ChangePasswordRequest, ChangePasswordResponse } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profileSubject = new BehaviorSubject<Profile | null>(null);
  public profile$ = this.profileSubject.asObservable();
  
  // URL de NestJS (Microservicio de Negocio) sin el prefijo /api
  private nestApiUrl = 'http://localhost:3000'; 

  constructor(
    private api: ApiService,
    private http: HttpClient
  ) {}

  getCurrentProfile(): Profile | null {
    return this.profileSubject.getValue();
  }

  setProfile(profile: Profile | null): void {
    this.profileSubject.next(profile);
  }

  // ==========================================
  // SEGURIDAD & PERFIL (SPRING BOOT - PUERTO 5050)
  // ==========================================

  getMyProfile(): Observable<Profile> {
    return this.api.get<Profile>('/profiles/me').pipe(
      tap(profile => this.profileSubject.next(profile))
    );
  }

  createIfMissing(): Observable<Profile> {
    return this.api.get<Profile>('/profiles/create-if-missing').pipe(
      tap(profile => this.profileSubject.next(profile))
    );
  }

  updateProfile(phone?: string | null, photo?: string | null): Observable<Profile> {
    const hasPhone = phone && phone.trim();
    const hasPhoto = photo && photo.trim();

    if (!hasPhone && !hasPhoto) {
      return throwError(() => new Error('Debe proporcionar al menos un campo para actualizar'));
    }

    return this.getMyProfile().pipe(
      switchMap((currentProfile: Profile) => {
        if (!currentProfile || !currentProfile.id) {
          return throwError(() => new Error('No se pudo obtener el perfil actual'));
        }

        const updatedProfile = {
          id: currentProfile.id,
          phone: hasPhone ? phone!.trim() : currentProfile.phone,
          photo: hasPhoto ? photo!.trim() : currentProfile.photo
        };

        // 1. Actualiza en Spring Boot
        return this.api.put<Profile>(`/profiles/${currentProfile.id}`, updatedProfile).pipe(
          tap(profile => this.profileSubject.next(profile)),
          switchMap((profileGuardadoEnSeguridad) => {
            // 2. Sincroniza el teléfono en NestJS usando la nueva ruta por UUID de seguridad
            if (hasPhone) {
              return this.http.patch(`${this.nestApiUrl}/persona/security/${profileGuardadoEnSeguridad.id}`, { 
                telefono: phone!.trim() 
              }).pipe(
                switchMap(() => [profileGuardadoEnSeguridad])
              );
            }
            return [profileGuardadoEnSeguridad];
          })
        );
      })
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<ChangePasswordResponse> {
    const request: ChangePasswordRequest = { currentPassword, newPassword, confirmPassword };
    return this.api.post<ChangePasswordResponse>('/profiles/change-password', request);
  }

  // ==========================================
  // SINCRONIZACIÓN DE NEGOCIO (NESTJS - PUERTO 3000)
  // ==========================================

  // Verifica si la persona existe en el negocio usando su UUID de seguridad
  verificarOIdPersonaNegocio(securityUserId: string): Observable<any> {
    return this.http.get<any>(`${this.nestApiUrl}/persona/security/${securityUserId}`);
  }

  // Crea la persona en el negocio (lo cual creará automáticamente el ciudadano en cascada)
  crearPersonaNegocio(personaData: any): Observable<any> {
    return this.http.post<any>(`${this.nestApiUrl}/persona`, personaData);
  }

  // Actualiza la fecha de nacimiento usando el ID numérico que comparten persona y ciudadano
  updateFechaNacimiento(ciudadanoId: string, fechaNacimiento: string): Observable<any> {
    return this.http.patch(`${this.nestApiUrl}/ciudadano/${ciudadanoId}`, { fechaNacimiento });
  }
}