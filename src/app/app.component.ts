import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

interface NavItemDef {
  label: string;
  icon: string;
  route: string;
}

interface NavGroup {
  label: string;
  roles: string[];
  items: NavItemDef[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MoviRuta Control Center';
  sidebarOpen = true;
  isMobile = false;
  currentUrl = '';
  userRoles: string[] = [];

  private routerSub: Subscription;
  private rolesSub: Subscription;

  readonly navGroups: NavGroup[] = [
    {
      label: '',
      roles: [],
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
        { label: 'Perfil', icon: 'person', route: '/profile' },
        { label: 'Planificar Rutas', icon: 'map', route: '/rutas' },
        { label: 'Mis Viajes', icon: 'confirmation_number', route: '/movilidad/boletos' },
      ]
    },
    {
      label: 'Ciudadano',
      roles: ['CIUDADANO'],
      items: [
        { label: 'Recargar Tarjeta', icon: 'credit_card', route: '/ciudadano/tarjeta/recargar' },
      ]
    },
    {
      label: 'Conductor',
      roles: ['CONDUCTOR'],
      items: [
        { label: 'Mi Turno', icon: 'schedule', route: '/conductor/dashboard' },
        { label: 'Reportar Incidente', icon: 'report_problem', route: '/conductor/incidente/nuevo' },
      ]
    },
    {
      label: 'Administración',
      roles: ['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR'],
      items: [
        { label: 'Flota de Buses', icon: 'directions_bus', route: '/admin/buses' },
        { label: 'Paraderos', icon: 'place', route: '/admin/paraderos' },
        { label: 'Rutas', icon: 'route', route: '/admin/rutas' },
        { label: 'Programaciones', icon: 'calendar_month', route: '/admin/programaciones' },
      ]
    },
    {
      label: 'Reportes',
      roles: ['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR'],
      items: [
        { label: 'Ingresos', icon: 'payments', route: '/admin/reportes/ingresos' },
        { label: 'Demografía', icon: 'people', route: '/admin/reportes/demografia' },
        { label: 'Incidentes', icon: 'warning', route: '/admin/reportes/incidentes' },
      ]
    },
    {
      label: 'Sistema',
      roles: ['ADMIN'],
      items: [
        { label: 'Usuarios', icon: 'groups', route: '/admin/users' },
        { label: 'Roles', icon: 'verified_user', route: '/admin/roles' },
        { label: 'Permisos', icon: 'policy', route: '/admin/permissions' },
        { label: 'Sesiones', icon: 'devices', route: '/admin/sessions' },
      ]
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUrl = this.router.url;

    this.routerSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentUrl = event.urlAfterRedirects;
      if (this.isMobile && this.sidebarOpen) {
        this.sidebarOpen = false;
      }
    });

    this.rolesSub = this.authService.userRoles$.subscribe(roles => {
      this.userRoles = roles;
    });
  }

  ngOnInit(): void {
    this.checkScreenSize();
    // Garantiza que los roles estén cargados en cualquier ruta de entrada,
    // no solo cuando el usuario pasa por el Dashboard o hace login en esta sesión.
    if (this.authService.isAuthenticated() && this.authService.getUserRoles().length === 0) {
      this.authService.getMyRoles().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.rolesSub?.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    if (typeof window !== 'undefined') {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 960;

      if (this.isMobile && !wasMobile) {
        this.sidebarOpen = false;
      }
      if (!this.isMobile && wasMobile) {
        this.sidebarOpen = true;
      }
    }
  }

  hasAnyRole(roles: string[]): boolean {
    if (roles.length === 0) return true;
    return roles.some(role => this.userRoles.includes(role));
  }

  get showShell(): boolean {
    return this.authService.isAuthenticated()
      && !this.isAuthRoute(this.currentUrl)
      && !this.currentUrl.startsWith('/home');
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  onContentScroll(): void {
    if (this.isMobile && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }

  private isAuthRoute(url: string): boolean {
    return [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-2fa',
      '/auth/callback'
    ].some(route => url.startsWith(route));
  }
}