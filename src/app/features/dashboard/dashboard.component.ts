import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { User, Profile } from '../../shared/models/user.model';
import { SkeletonLoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CountUpDirective } from '../../shared/models/count-up.directive';
import { SecurityLogger } from '../../core/utils/security-logger';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, SkeletonLoaderComponent, EmptyStateComponent, CountUpDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  accessDeniedMessage: string | null = null;
  currentUser: User | null = null;
  profile: Profile | null = null;
  userRoles: string[] = [];
  loading = true;
  avatarError = false;

  stats = {
    activeSessions: 1,
    rolesCount: 0,
    profileComplete: false
  };

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadRoles();

    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'access-denied') {
        this.accessDeniedMessage = 'No tienes permisos para acceder a esa seccion';
        setTimeout(() => {
          this.accessDeniedMessage = null;
          this.router.navigate([], { queryParams: {} });
        }, 5000);
      }
    });
  }

  private loadUserData(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile: Profile) => {
        this.profile = profile;
        this.currentUser = profile.user;

        if (profile.user) {
          this.authService.setCurrentUser(profile.user);
        }

        this.stats.profileComplete = !!(profile.phone && profile.photo);
        this.loading = false;
      },
      error: (err: any) => {
        SecurityLogger.warn('Profile', 'No se pudo cargar el perfil para el dashboard', err);

        const storedUser = this.authService.getCurrentUser();
        if (storedUser) {
          this.currentUser = storedUser;
        }

        this.loading = false;

        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private loadRoles(): void {
    this.authService.getMyRoles().subscribe({
      next: data => {
        this.userRoles = data.roles;
        this.stats.rolesCount = data.roles.length;
      },
      error: err => {
        SecurityLogger.warn('Roles', 'No se pudieron cargar los roles para el dashboard', err);
        const storedRoles = this.authService.getUserRoles();
        if (storedRoles.length > 0) {
          this.userRoles = storedRoles;
          this.stats.rolesCount = storedRoles.length;
        }
      }
    });
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get firstName(): string {
    if (!this.currentUser?.name) return 'Usuario';
    return this.currentUser.name.split(' ')[0];
  }

  get userInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  }

  get isAdmin(): boolean {
    return this.userRoles
      .map(r => (r ?? '').toUpperCase())
      .includes('ADMINISTRADOR');
  }

  getProviderDisplay(provider: string | undefined): string {
    switch (provider?.toUpperCase()) {
      case 'GOOGLE': return 'Google';
      case 'GITHUB': return 'GitHub';
      case 'MICROSOFT': return 'Microsoft';
      default: return 'Local';
    }
  }

  getProviderIcon(provider: string | undefined): string {
    switch (provider?.toUpperCase()) {
      case 'GOOGLE': return 'g_mobiledata';
      case 'GITHUB': return 'code';
      case 'MICROSOFT': return 'window';
      default: return 'lock';
    }
  }

  getProviderName(provider: string | undefined): string {
    switch (provider?.toUpperCase()) {
      case 'GOOGLE': return 'Google';
      case 'GITHUB': return 'GitHub';
      case 'MICROSOFT': return 'Microsoft';
      default: return 'Local';
    }
  }

  navigateTo(route: string, queryParams?: { [key: string]: string }): void {
    if (queryParams) {
      this.router.navigate([route], { queryParams });
    } else {
      this.router.navigate([route]);
    }
  }

  onAvatarError(): void {
    this.avatarError = true;
    this.cdr.detectChanges();
  }
}
