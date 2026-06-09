import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import {
  LoginRequest,
  LoginResponse,
  Verify2faRequest,
  Verify2faResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse
} from '../../shared/models/auth.model';
import { User, Profile } from '../../shared/models/user.model';
import { SecurityLogger } from '../utils/security-logger';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly TOKEN_KEY = 'jwt';
  private readonly USER_KEY = 'current_user';
  private readonly ROLES_KEY = 'userRoles';
  private readonly PROFILE_ID_KEY = 'profileId';
  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionRedirectInProgress = false;

  private userRolesSubject = new BehaviorSubject<string[]>(this.getRolesFromStorage());
  public userRoles$ = this.userRolesSubject.asObservable();

  constructor(private api: ApiService) {
    const token = this.getToken();
    if (token) {
      this.scheduleTokenExpiration(token);
      SecurityLogger.info('JWT', 'Sesion restaurada desde almacenamiento local', {
        expiresAt: this.getTokenExpirationDate(token)
      });
    }
  }

  login(email: string, password: string, recaptchaToken: string): Observable<LoginResponse> {
    const request: LoginRequest = { email, password, recaptchaToken };
    SecurityLogger.info('Auth', 'Iniciando solicitud de login');

    return this.api.post<LoginResponse>('/public/security/login', request).pipe(
      map(response => {
        if (response.token) {
          this.setToken(response.token);
          this.isAuthenticatedSubject.next(true);
          SecurityLogger.info('Auth', 'Login completado sin 2FA');
        } else if (response.requires2FA) {
          SecurityLogger.info('Auth', 'Login requiere verificacion 2FA');
        }

        return response;
      })
    );
  }

  verify2fa(email: string, code: string): Observable<Verify2faResponse> {
    const request: Verify2faRequest = { email, code };
    SecurityLogger.info('2FA', 'Validando codigo de verificacion');

    return this.api.post<Verify2faResponse>('/public/security/verify-2fa', request).pipe(
      map(response => {
        this.setToken(response.token);
        this.isAuthenticatedSubject.next(true);
        SecurityLogger.info('2FA', 'Verificacion completada');
        return response;
      })
    );
  }

  /**
   * Backend requiere reCAPTCHA también en /public/security/resend-2fa.
   */
  resend2fa(email: string, recaptchaToken: string): Observable<any> {
    SecurityLogger.info('2FA', 'Solicitando reenvio de codigo');
    return this.api.post<any>('/public/security/resend-2fa', { email, recaptchaToken });
  }

  register(name: string, email: string, password: string): Observable<RegisterResponse> {
    const request: RegisterRequest = { name, email, password };
    return this.api.post<RegisterResponse>('/public/security/register', request);
  }

  forgotPassword(email: string, recaptchaToken: string): Observable<ForgotPasswordResponse> {
    const request: ForgotPasswordRequest = { email, recaptchaToken };
    SecurityLogger.info('Recovery', 'Solicitando recuperacion de contrasena');
    return this.api.post<ForgotPasswordResponse>('/public/security/forgot-password', request);
  }

  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    const request: ResetPasswordRequest = { token, newPassword };
    SecurityLogger.info('Recovery', 'Enviando nueva contrasena');
    return this.api.post<ResetPasswordResponse>('/public/security/reset-password', request);
  }

  loginWithGoogle(): void {
    this.api.get<{ url: string }>('/public/oauth2/login/google').subscribe({
      next: response => {
        SecurityLogger.info('OAuth', 'Redirigiendo a Google');
        window.location.href = response.url;
      },
      error: err => {
        SecurityLogger.error('OAuth', 'No se pudo iniciar Google OAuth', err);
      }
    });
  }

  loginWithGitHub(): void {
    this.api.get<{ url: string }>('/public/oauth2/login/github').subscribe({
      next: response => {
        SecurityLogger.info('OAuth', 'Redirigiendo a GitHub');
        window.location.href = response.url;
      },
      error: err => {
        SecurityLogger.error('OAuth', 'No se pudo iniciar GitHub OAuth', err);
      }
    });
  }

  loginWithMicrosoft(): void {
    this.api.get<{ url: string }>('/public/oauth2/login/microsoft').subscribe({
      next: response => {
        SecurityLogger.info('OAuth', 'Redirigiendo a Microsoft');
        window.location.href = response.url;
      },
      error: err => {
        SecurityLogger.error('OAuth', 'No se pudo iniciar Microsoft OAuth', err);
      }
    });
  }

  handleOAuthCallback(): { token: string | null; error: string | null } {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      this.setToken(token);
      SecurityLogger.info('OAuth', 'Token OAuth recibido correctamente');
      return { token, error: null };
    }

    return { token: null, error: error || 'Unknown error' };
  }

  logout(): void {
    this.clearSession();
    this.sessionRedirectInProgress = false;
    SecurityLogger.info('Auth', 'Sesion cerrada');
  }

  expireSession(): void {
    this.clearSession();
    SecurityLogger.warn('JWT', 'Token expirado, sesion finalizada');

    if (this.sessionRedirectInProgress) {
      return;
    }

    this.sessionRedirectInProgress = true;
    this.toast.warning('Tu sesion expiro. Ingresa nuevamente para continuar.');
    this.router.navigate(['/login'], {
      queryParams: { reason: 'session-expired' }
    }).finally(() => {
      this.sessionRedirectInProgress = false;
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    const expirationDate = this.getTokenExpirationDate(token);
    SecurityLogger.info('JWT', 'Token almacenado', { expiresAt: expirationDate });
    this.scheduleTokenExpiration(token);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  getMe(): Observable<Profile> {
    return this.api.get<Profile>('/profiles/me').pipe(
      tap(profile => {
        if (profile?.user) {
          this.setCurrentUser(profile.user);
        }

        if (profile?.id) {
          localStorage.setItem(this.PROFILE_ID_KEY, profile.id);
        }
      })
    );
  }

  getMyRoles(): Observable<{ roles: string[] }> {
    SecurityLogger.info('Roles', 'Consultando roles del usuario autenticado');

    return this.api.get<{ roles: string[] }>('/user-role/my-roles').pipe(
      tap(data => {
        this.setUserRoles(data.roles);
        SecurityLogger.info('Roles', 'Roles cargados', data.roles);
      })
    );
  }

  setUserRoles(roles: string[]): void {
    this.userRolesSubject.next(roles);
    localStorage.setItem(this.ROLES_KEY, JSON.stringify(roles));
  }

  getUserRoles(): string[] {
    return this.userRolesSubject.getValue();
  }

  private getRolesFromStorage(): string[] {
    const rolesJson = localStorage.getItem(this.ROLES_KEY);
    return rolesJson ? JSON.parse(rolesJson) : [];
  }

  hasRole(role: string): boolean {
    if (!role) return false;
    const target = role.toUpperCase();
    return this.getUserRoles().some(r => (r ?? '').toUpperCase() === target);
  }

  /**
   * Fuente única de verdad para chequeos de rol del frontend.
   * Normaliza ambos lados a UPPERCASE para evitar mismatch por capitalización.
   * Devuelve true si el array `requiredRoles` está vacío (sin restricción).
   */
  hasAnyRole(requiredRoles: string[] | null | undefined): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const userRoles = this.getUserRoles().map(r => (r ?? '').toUpperCase());
    return requiredRoles.some(r => userRoles.includes((r ?? '').toUpperCase()));
  }

  isAdmin(): boolean {
    return this.hasRole('ADMINISTRADOR');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const expirationDate = this.getTokenExpirationDate(token);
    if (!expirationDate || expirationDate.getTime() <= Date.now()) {
      this.expireSession();
      return false;
    }

    return true;
  }

  private scheduleTokenExpiration(token: string): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    const expirationDate = this.getTokenExpirationDate(token);
    if (!expirationDate) {
      return;
    }

    const remainingTime = expirationDate.getTime() - Date.now();
    if (remainingTime <= 0) {
      this.expireSession();
      return;
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.expireSession();
    }, remainingTime);
  }

  private getTokenExpirationDate(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) {
        return null;
      }

      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.ROLES_KEY);
    localStorage.removeItem(this.PROFILE_ID_KEY);
    sessionStorage.removeItem('2fa_email');
    sessionStorage.removeItem('2fa_start_time');

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    this.currentUserSubject.next(null);
    this.userRolesSubject.next([]);
    this.isAuthenticatedSubject.next(false);
  }
}