import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
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
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MoviRuta Control Center';
  sidebarOpen = true;
  isMobile = false; // Añadido: Controla si estamos en vista móvil
  currentUrl = '';
  
  private routerSub: Subscription;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Perfil', icon: 'person', route: '/profile' },
    // 🗺️ NUEVO: Módulo de Planificación de Viajes (Accesible para todos)
    { label: 'Planificar Rutas', icon: 'map', route: '/rutas' }, 
    
    // Rutas protegidas de administración
    { label: 'Usuarios', icon: 'groups', route: '/admin/users', adminOnly: true },
    { label: 'Roles', icon: 'verified_user', route: '/admin/roles', adminOnly: true },
    { label: 'Permisos', icon: 'policy', route: '/admin/permissions', adminOnly: true },
    { label: 'Sesiones', icon: 'devices', route: '/admin/sessions', adminOnly: true }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUrl = this.router.url;

    // Suscripción a eventos del router (actualiza URL y cierra sidebar en móvil)
    this.routerSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentUrl = event.urlAfterRedirects;
      // Cierra el sidebar al navegar si estamos en versión móvil
      if (this.isMobile && this.sidebarOpen) {
        this.sidebarOpen = false;
      }
    });
  }

  ngOnInit(): void {
    this.checkScreenSize(); // Revisamos el tamaño al iniciar la app
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  // Escuchamos los cambios en el tamaño de la ventana en tiempo real
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  // Verifica el tamaño de pantalla y ajusta el estado del sidebar
  private checkScreenSize(): void {
    if (typeof window !== 'undefined') {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 960;

      // Si la pantalla pasa de escritorio a móvil, ocultamos el menú
      if (this.isMobile && !wasMobile) {
        this.sidebarOpen = false;
      }
      // Si pasa de móvil a escritorio, lo volvemos a mostrar
      if (!this.isMobile && wasMobile) {
        this.sidebarOpen = true;
      }
    }
  }

  get showShell(): boolean {
    return this.authService.isAuthenticated()
      && !this.isAuthRoute(this.currentUrl)
      && !this.currentUrl.startsWith('/home');
  }

  get isAdmin(): boolean {
    const roles = this.authService.getUserRoles();
    return roles.includes('Administrador Sistema') || roles.includes('ADMIN');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Detecta el scroll en el contenedor principal
  onContentScroll(): void {
    // Solo cerramos por scroll si estamos en vista móvil
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