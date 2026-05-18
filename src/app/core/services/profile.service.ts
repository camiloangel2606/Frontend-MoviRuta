import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // <-- IMPORTANTE: Inyectamos el cliente nativo
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
  
  // URL Base para tu Microservicio de Negocio en NestJS
  private nestApiUrl = 'http://localhost:3000'; 

  constructor(
    private api: ApiService,
    private http: HttpClient // <-- Inyectado aquí
  ) {}

  getCurrentProfile(): Profile | null {
    return this.profileSubject.getValue();
  }

  setProfile(profile: Profile | null): void {
    this.profileSubject.next(profile);
  }

  // ==========================================
  // SEGURIDAD & PERFIL (MMS SECURITY - PUERTO 5050)
  // ==========================================

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
    const request: ChangePasswordRequest = { currentPassword, newPassword, confirmPassword };
    return this.api.post<ChangePasswordResponse>('/profiles/change-password', request);
  }

  // ==========================================
  // NEGOCIO, PAGOS Y DIRECCIONES (NESTJS - PUERTO 3000)
  // ==========================================

  // 1. Sincronización de persona
  verificarOIdPersonaNegocio(securityUserId: string): Observable<any> {
    return this.http.get<any>(`${this.nestApiUrl}/persona/security/${securityUserId}`);
  }

  crearPersonaNegocio(personaData: any): Observable<any> {
    return this.http.post<any>(`${this.nestApiUrl}/persona`, personaData);
  }

  // 2. Actualizar fecha de nacimiento
  updateFechaNacimiento(ciudadanoId: string, fechaNacimiento: string): Observable<any> {
    return this.http.patch(`${this.nestApiUrl}/ciudadanos/${ciudadanoId}`, { fechaNacimiento });
  }

  // 3. Métodos de Pago 
  getMetodosPago(): Observable<any[]> {
    // CORREGIDO: Cambiado de /metodos-pago a /metodo-pago
    return this.http.get<any[]>(`${this.nestApiUrl}/metodo-pago`);
  }

  createMetodoPago(nombre: string, tipo: string): Observable<any> {
    const currentProfile = this.getCurrentProfile();
    const userId = currentProfile?.user?.id;

    const payload = { 
      nombre, 
      tipo,
      userId: userId
    };
    // CORREGIDO: Cambiado de /metodos-pago a /metodo-pago
    return this.http.post<any>(`${this.nestApiUrl}/metodo-pago`, payload);
  }

  // 4. Direcciones
  getDirecciones(): Observable<any[]> {
    // CORREGIDO: Cambiado de /direcciones a /direccion
    return this.http.get<any[]>(`${this.nestApiUrl}/direccion`);
  }

  createDireccion(direccionData: any): Observable<any> {
    // CORREGIDO: Cambiado de /direcciones a /direccion
    return this.http.post<any>(`${this.nestApiUrl}/direccion`, direccionData);
  }

  // ==========================================
  // VALIDACIONES ESTÁTICAS
  // ==========================================
  static validatePhotoUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) return null;
    const trimmedUrl = url.trim();
    if (!trimmedUrl.toLowerCase().startsWith('https://')) return 'La URL debe comenzar con https://';
    return null;
  }
}