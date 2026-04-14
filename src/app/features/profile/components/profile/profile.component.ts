import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [CommonModule, MatTooltipModule, MatIconModule, ProfileEditComponent, ChangePasswordComponent, MySessionsComponent],
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

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfileFromBackend();

    this.route.queryParams.subscribe(params => {
      if (params['section'] === 'sessions') {
        this.showMySessions = true;
        this.showProfileEdit = false;
        this.showChangePassword = false;
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
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

        this.loading = false;
      },
      error: err => {
        SecurityLogger.warn('Profile', 'No se pudo cargar la vista de perfil', err);
        this.loading = false;

        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  reloadProfile(): void {
    this.loadProfileFromBackend();
  }

  toggleProfileEdit(): void {
    this.showProfileEdit = !this.showProfileEdit;
    this.showChangePassword = false;
    this.showMySessions = false;
  }

  toggleChangePassword(): void {
    this.showChangePassword = !this.showChangePassword;
    this.showProfileEdit = false;
    this.showMySessions = false;
  }

  toggleMySessions(): void {
    this.showMySessions = !this.showMySessions;
    this.showProfileEdit = false;
    this.showChangePassword = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onAvatarError(): void {
    this.avatarError = true;
    this.cdr.detectChanges();
  }
}
