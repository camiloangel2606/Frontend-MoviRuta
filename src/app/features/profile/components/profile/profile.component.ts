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
  showMetodosPago = false;
  showDirecciones = false;

  metodosPago: any[] = [];
  direcciones: any[] = [];
  personaMysql: any = null; // <-- Guardará la información de la BD de Negocio

  fechaNacimientoForm!: FormGroup;
  metodoPagoForm!: FormGroup;
  direccionForm!: FormGroup;

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

    this.metodoPagoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      tipo: ['TARJETA_CREDITO', [Validators.required]]
    });

    this.direccionForm = this.fb.group({
      linea1: ['', [Validators.required, Validators.maxLength(200)]],
      linea2: ['', [Validators.maxLength(200)]],
      ciudad: ['', [Validators.required, Validators.maxLength(120)]],
      departamento: ['', [Validators.required, Validators.maxLength(120)]],
      codigoPostal: ['', [Validators.maxLength(20)]]
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
        this.loading = false;
        this.cargarDatosNegocio();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // Si el backend de negocio responde 404 significa que la persona no existe en MySQL
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

          // Registrar automáticamente en MySQL
          this.profileService.crearPersonaNegocio(payloadPersona).subscribe({
            next: (nuevaPersona) => {
              this.personaMysql = nuevaPersona;
              this.loading = false;
              this.cargarDatosNegocio();
              this.cdr.detectChanges();
            },
            error: (createErr) => {
              console.error('Error al registrar persona en negocio:', createErr);
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

  cargarDatosNegocio(): void {
    this.profileService.getMetodosPago().subscribe({ 
      next: (data: any[]) => {
        this.metodosPago = data || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error metodos pago:', err)
    });

    this.profileService.getDirecciones().subscribe({ 
      next: (data: any[]) => {
        this.direcciones = data || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error direcciones:', err)
    });
  }

  private getProfileId(): string | null {
    if (!this.profile) return null;
    return this.profile.id || (this.profile as any)._id || null;
  }

  guardarFechaNacimiento(): void {
    const profileId = this.getProfileId();
    if (this.fechaNacimientoForm.valid && profileId) {
      this.profileService.updateFechaNacimiento(profileId, this.fechaNacimientoForm.value.fecha).subscribe({
        next: () => {
          alert('Fecha de nacimiento registrada.');
          this.reloadProfile();
        },
        error: (err: any) => alert('Error al actualizar fecha: ' + err.message)
      });
    }
  }

  agregarMetodoPago(): void {
    if (this.metodoPagoForm.valid) {
      const { nombre, tipo } = this.metodoPagoForm.value;
      this.profileService.createMetodoPago(nombre, tipo).subscribe({
        next: (nuevo: any) => {
          this.metodosPago.push(nuevo);
          this.metodoPagoForm.reset({ tipo: 'TARJETA_CREDITO' });
          this.cdr.detectChanges();
        },
        error: (err: any) => alert('Error en DTO Método de Pago: ' + err.message)
      });
    }
  }

  agregarDireccion(): void {
    // Usamos el id numérico de MySQL que guardamos en personaMysql para la relación correcta
    if (this.direccionForm.valid && this.personaMysql) {
      const nuevaDireccion = {
        ...this.direccionForm.value,
        personaId: this.personaMysql.id // Relación limpia con tu tabla de MySQL
      };
      this.profileService.createDireccion(nuevaDireccion).subscribe({
        next: (nuevo: any) => {
          this.direcciones.push(nuevo);
          this.direccionForm.reset();
          this.cdr.detectChanges();
        },
        error: (err: any) => alert('Error en DTO Dirección: ' + err.message)
      });
    }
  }

  private resetAllSections(): void {
    this.showProfileEdit = false;
    this.showChangePassword = false;
    this.showMySessions = false;
    this.showMetodosPago = false;
    this.showDirecciones = false;
  }

  toggleProfileEdit(): void { const state = !this.showProfileEdit; this.resetAllSections(); this.showProfileEdit = state; }
  toggleChangePassword(): void { const state = !this.showChangePassword; this.resetAllSections(); this.showChangePassword = state; }
  toggleMySessions(): void { const state = !this.showMySessions; this.resetAllSections(); this.showMySessions = state; }
  toggleMetodosPago(): void { const state = !this.showMetodosPago; this.resetAllSections(); this.showMetodosPago = state; }
  toggleDirecciones(): void { const state = !this.showDirecciones; this.resetAllSections(); this.showDirecciones = state; }

  reloadProfile(): void { this.loadProfileFromBackend(); }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
  onAvatarError(): void { this.avatarError = true; this.cdr.detectChanges(); }
}