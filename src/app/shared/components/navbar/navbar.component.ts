import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { User, Profile } from '../../models/user.model';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  currentUser: User | null = null;
  profile: Profile | null = null;
  isMenuOpen = false;
  isNotificationsOpen = false;
  userRoles: string[] = [];
  loggingOut = false;
  notificationCount = 0;
  notifications: AppNotification[] = [];
  avatarError = false;
  pageTitle = 'Centro de Operaciones';

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private sessionService: SessionService,
    private notificationService: NotificationService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.authService.userRoles$.subscribe(roles => {
      this.userRoles = roles;
    });

    this.profileService.profile$.subscribe(profile => {
      if (profile) {
        this.profile = profile;
        this.avatarError = false;
        if (profile.user) {
          this.currentUser = profile.user;
        }
      }
    });

    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      this.notificationCount = notifications.filter(notification => !notification.read).length;
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.pageTitle = this.resolveTitle(event.urlAfterRedirects);
    });

    this.pageTitle = this.resolveTitle(this.router.url);

    if (this.authService.isAuthenticated()) {
      this.loadProfile();
      this.authService.getMyRoles().subscribe();
    }
  }

  private loadProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        if (profile.user) {
          this.authService.setCurrentUser(profile.user);
        }
      },
      error: () => {}
    });
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userInitials(): string {
    if (!this.currentUser?.name) {
      return 'MR';
    }

    const names = this.currentUser.name.split(' ');
    return names.slice(0, 2).map(name => name.charAt(0)).join('').toUpperCase();
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.isMenuOpen = false;
      this.notificationService.markAllAsRead();
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isNotificationsOpen = false;
    }
  }

  closeAllMenus(): void {
    this.isMenuOpen = false;
    this.isNotificationsOpen = false;
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;
    this.closeAllMenus();

    this.sessionService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
        this.loggingOut = false;
      },
      error: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
        this.loggingOut = false;
      }
    });
  }

  onAvatarError(): void {
    this.avatarError = true;
  }

  formatNotificationDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  private resolveTitle(url: string): string {
    if (url.startsWith('/admin/users')) {
      return 'Gestion de Usuarios';
    }

    if (url.startsWith('/admin/roles')) {
      return 'Gestion de Roles';
    }

    if (url.startsWith('/admin/permissions')) {
      return 'Control de Permisos';
    }

    if (url.startsWith('/admin/sessions')) {
      return 'Sesiones Activas';
    }

    if (url.startsWith('/admin')) {
      return 'Centro Administrativo';
    }

    if (url.startsWith('/profile')) {
      return 'Perfil del Operador';
    }

    return 'Centro de Operaciones';
  }
}
