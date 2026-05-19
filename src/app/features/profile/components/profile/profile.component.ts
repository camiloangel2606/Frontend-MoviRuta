import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { useRoles } from '../../../../core/services/use-roles';
import { User, Profile } from '../../../../shared/models/user.model';
import { ProfileEditComponent } from '../profile-edit.component';
import { ChangePasswordComponent } from '../change-password.component';
import { MySessionsComponent } from '../my-sessions.component';
import { SecurityLogger } from '../../../../core/utils/security-logger';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    MatTooltipModule, 
    MatIconModule, 
    ReactiveFormsModule, 
    FormsModule, 
    ProfileEditComponent, 
    ChangePasswordComponent, 
    MySessionsComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  profile: Profile | null = null;
  loading = true;
  avatarError = false;
  roles = useRoles();
  
  showProfileEdit = false;
  showChangePassword = false;
  showMySessions = false;

  personaMysql: any = null; // Guardará la información de la BD de Negocio
  negocioPersonaId: number | null = null;

  fechaNacimientoForm!: FormGroup;

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initNuevosFormularios();
    this.loadProfileFromBackend();

    this.route.queryParams.subscribe((params: any) => {
      if (params['section'] === 'sessions') {
        this.resetAllSections();
        this.showMySessions = true;
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  private initNuevosFormularios(): void {
    this.fechaNacimientoForm = this.fb.group({
      fecha: ['', [Validators.required]]
    });
  }

  private loadProfileFromBackend(): void {
    this.loading = true;
    this.profileService.getMyProfile().subscribe({
      next: (profile: Profile) => {
        this.profile = profile;
        this.currentUser = profile.user;
        if (profile.user) {
          this.auth.setCurrentUser(profile.user);
        }
        
        // Sincronización con la base de datos de negocio
        this.sincronizarConNegocio(profile);
      },
      error: (err: any) => {
        SecurityLogger.warn('Profile', 'No se pudo cargar la vista de perfil', err);
        this.loading = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private sincronizarConNegocio(profile: Profile): void {
    if (!profile.user || !profile.user.id) return;

    const securityUserId = profile.user.id;

    // Verificar si la persona ya existe en MySQL
    this.profileService.verificarOIdPersonaNegocio(securityUserId).subscribe({
      next: (persona) => {
        this.personaMysql = persona;
        this.setNegocioPersonaId(persona);
        this.verificarYActivarFlujoConductor(securityUserId);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // Si responde 404 significa que la persona no existe en MySQL
        if (err.status === 404) {
          const nombresCompletos = profile.user.name || 'Usuario';
          const spaceIndex = nombresCompletos.indexOf(' ');
          
          const payloadPersona = {
            nombres: spaceIndex !== -1 ? nombresCompletos.substring(0, spaceIndex) : nombresCompletos,
            apellidos: spaceIndex !== -1 ? nombresCompletos.substring(spaceIndex + 1) : 'Sin Apellido',
            email: profile.user.email,
            telefono: profile.phone || null,
            securityUserId: securityUserId
          };

          // Registrar automáticamente en MySQL (esto creará también al Ciudadano en cascada)
          this.profileService.crearPersonaNegocio(payloadPersona).subscribe({
            next: (nuevaPersona) => {
              this.personaMysql = nuevaPersona;
              this.setNegocioPersonaId(nuevaPersona);
              this.verificarYActivarFlujoConductor(securityUserId);
              this.loading = false;
              this.cdr.detectChanges();
            },
            error: (createErr) => {
              console.error('Error detallado del backend:', createErr);
              alert(`Error de sincronización: ${createErr.error?.message || createErr.message}`);
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // Método auxiliar: comprobación de roles y activación de flujo conductor
  private verificarYActivarFlujoConductor(securityUserId: string): void {
    this.profileService.obtenerRolesDesdeSecurity().subscribe({
      next: (res) => {
        // Soporta ambos formatos: objeto con roles o array directo
        const listaRoles = res?.roles || (Array.isArray(res) ? res : []);
        if (listaRoles.includes('CONDUCTOR') || listaRoles.includes('ROLE_CONDUCTOR')) {
          this.profileService.inicializarConductorEnNegocio(securityUserId).subscribe({
            next: () => console.log('[FRONTEND] Tabla conductor sincronizada correctamente en MySQL.'),
            error: (err) => console.error('[FRONTEND] Error al intentar crear la fila de conductor en NestJS:', err)
          });
        }
      },
      error: (err) => {
        console.error('[FRONTEND] No se pudieron obtener los roles del usuario:', err);
      }
    });
  }

  private getProfileId(): string | null {
    if (!this.profile) return null;
    return this.profile.id || (this.profile as any)._id || null;
  }

  private setNegocioPersonaId(persona: any): void {
    const idValue = persona?.id;
    if (idValue === null || idValue === undefined) {
      this.negocioPersonaId = null;
      return;
    }
    this.negocioPersonaId = typeof idValue === 'number' ? idValue : Number(idValue);
    if (Number.isNaN(this.negocioPersonaId)) {
      this.negocioPersonaId = null;
    }
  }

  guardarFechaNacimiento(): void {
    if (this.fechaNacimientoForm.valid && this.negocioPersonaId !== null) {
      this.profileService.updateFechaNacimiento(String(this.negocioPersonaId), this.fechaNacimientoForm.value.fecha).subscribe({
        next: () => {
          alert('Fecha de nacimiento registrada.');
          this.reloadProfile();
        },
        error: (err: any) => alert('Error al actualizar fecha: ' + err.message)
      });
    }
  }

  private resetAllSections(): void {
    this.showProfileEdit = false;
    this.showChangePassword = false;
    this.showMySessions = false;
  }

  toggleProfileEdit(): void { const state = !this.showProfileEdit; this.resetAllSections(); this.showProfileEdit = state; }
  toggleChangePassword(): void { const state = !this.showChangePassword; this.resetAllSections(); this.showChangePassword = state; }
  toggleMySessions(): void { const state = !this.showMySessions; this.resetAllSections(); this.showMySessions = state; }

  reloadProfile(): void { this.loadProfileFromBackend(); }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
  onAvatarError(): void { this.avatarError = true; this.cdr.detectChanges(); }
}