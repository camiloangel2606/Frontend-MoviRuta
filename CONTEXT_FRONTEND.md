# Frontend

## Tecnología, versión y librerías principales

- **Angular**: v19.2.x (standalone API — sin NgModules)
- **Angular Material**: ^19.2.19 — componentes UI (tabla, formularios, snackbar, sidenav, tabs, etc.)
- **RxJS**: ~7.8.0 — programación reactiva, BehaviorSubjects, operadores pipe
- **Leaflet**: ^1.9.4 — mapas interactivos y geolocalización
- **TypeScript**: ~5.7.2
- **Angular CDK**: ^19.2.19
- **Zone.js**: ~0.15.0
- Testing: Jasmine ~5.6.0 + Karma ~6.4.0

---

## Estructura de carpetas (explicada, no solo listada)

```
src/
└── app/
    ├── core/                        # Infraestructura transversal (no UI)
    │   ├── guards/                  # Protegen rutas: auth, rol, 2FA
    │   ├── interceptors/            # HTTP interceptors: JWT, errores, 401
    │   ├── services/                # Servicios singleton: auth, sesión, perfil,
    │   │                            #   notificaciones, toast, tema, reCAPTCHA,
    │   │                            #   planificación, boletos, pagos, direcciones
    │   └── utils/                   # Utilitarios (security-logger.ts)
    │
    ├── features/                    # Módulos de dominio (cada uno tiene sus
    │   │                            #   propios componentes, servicios y rutas)
    │   ├── auth/                    # Login, registro, 2FA, recuperación de contraseña,
    │   │                            #   callback OAuth (Google / GitHub / Microsoft)
    │   ├── dashboard/               # Pantalla principal tras login
    │   ├── profile/                 # Ver perfil, editar, cambiar contraseña, sesiones
    │   ├── home/                    # Página pública de inicio
    │   ├── rutas/                   # Mapa de rutas con Leaflet, planificación de viajes
    │   ├── boletos/                 # Gestión de tiquetes/boletos de transporte
    │   └── admin/                   # Panel de administración
    │       ├── admin-dashboard/
    │       └── components/          # CRUD de users, roles, permisos, sesiones
    │
    ├── shared/                      # Piezas reutilizables entre features
    │   ├── components/              # NavbarComponent, SkeletonLoaderComponent,
    │   │                            #   EmptyStateComponent
    │   └── models/                  # Interfaces TypeScript globales y directivas
    │
    ├── theme/                       # Variables SCSS globales (dark/light)
    ├── app.component.ts             # Shell raíz (solo <router-outlet>)
    ├── app.config.ts                # Configuración global: HttpClient, interceptors, router
    └── app.routes.ts                # Rutas principales con lazy loading

src/environments/                   # environment.ts / environment.prod.ts
```

---

## Cómo se manejan las llamadas a la API (axios, fetch, interceptores?)

Se usa **Angular HttpClient** (no axios ni fetch). Existe un servicio base centralizado:

**`src/app/core/services/api.service.ts`**
```typescript
// Encapsula HttpClient con token adjunto automático y manejo de errores
get<T>(endpoint: string): Observable<T>
post<T>(endpoint: string, body?: any): Observable<T>
put<T>(endpoint: string, body?: any): Observable<T>
patch<T>(endpoint: string, body?: any): Observable<T>
delete<T>(endpoint: string): Observable<T>
```
- La URL base se lee de `environment.apiUrl` (Spring Boot en puerto 5050).
- El token se lee de `localStorage.getItem('jwt')` y se inyecta manualmente en cada cabecera.
- Errores se centralizan en `handleError()` que lanza mensajes descriptivos.

**Interceptores registrados en `app.config.ts`:**

| Interceptor | Función |
|---|---|
| `authInterceptor` | Detecta respuestas 401, llama a `auth.expireSession()` y redirige a `/login` |
| `errorInterceptor` | Convierte errores HTTP en mensajes amigables en español y los muestra en toast |
| `jwtInterceptor` | (Legado) Adjunta Bearer token a peticiones hacia `localhost:5050` |

**Arquitectura dual de backends:**
- **Spring Boot** (`http://localhost:5050/api`) → seguridad, autenticación, perfiles, roles
- **NestJS** (`http://localhost:3000`) → lógica de negocio: rutas, boletos, planificación

Las llamadas a NestJS se hacen con `HttpClient` directamente desde `ProfileService` y `BoletoService`, usando `environment.negocioUrl`.

---

## Cómo se maneja la autenticación (dónde se guarda el token, cómo se adjunta)

**Almacenamiento:** `localStorage` bajo la clave `'jwt'`

**Flujo completo:**
1. Usuario envía credenciales desde `LoginComponent`.
2. `AuthService` llama a `POST /auth/login` vía `ApiService`.
3. Backend responde con `{ token, requires2FA }`.
4. Si `requires2FA === true` → redirige a `/verify-2fa` (código enviado al correo).
5. Si no → token guardado en `localStorage`, usuario redirigido a `/dashboard`.
6. Soporta OAuth con Google, GitHub y Microsoft (callback en `/auth/callback`).

**Adjuntado del token:**
- `ApiService` construye las cabeceras con `Authorization: Bearer <token>` en cada petición.
- `jwtInterceptor` también lo hace como capa de respaldo para rutas hacia `localhost:5050`.

**Expiración / logout:**
- Al recibir 401: `authInterceptor` llama a `expireSession()`, limpia estado y redirige a `/login`.
- `SessionService` permite cerrar sesiones individuales o todas (`logoutAll()`).

**Guards de ruta:**
- `authGuard` → exige token válido en rutas privadas.
- `roleGuard` → exige rol específico (ej. `Administrador Sistema`) para rutas de admin.
- `verify2faGuard` → exige que el paso 2FA esté completado.

**Estado reactivo:**
- `AuthService` expone `currentUser$` y `userRoles$` como `BehaviorSubject` para que los componentes se suscriban a cambios.

---

## Páginas ya construidas (ruta, qué hace)

### Públicas / Auth
| Ruta | Componente | Descripción |
|---|---|---|
| `/login` | `LoginComponent` | Formulario de login con reCAPTCHA v3 y acceso OAuth |
| `/register` | `RegisterComponent` | Registro de nuevo usuario |
| `/verify-2fa` | `VerifyTwoFactorComponent` | Ingreso del código 2FA enviado al correo |
| `/forgot-password` | `ForgotPasswordComponent` | Solicitud de recuperación de contraseña |
| `/reset-password` | `ResetPasswordComponent` | Nueva contraseña usando token del correo |
| `/auth/callback` | `AuthCallbackComponent` | Maneja el retorno OAuth de Google / GitHub / Microsoft |

### Privadas (requieren `authGuard`)
| Ruta | Componente | Descripción |
|---|---|---|
| `/dashboard` | `DashboardComponent` | Pantalla principal: stats, accesos rápidos, info del usuario |
| `/profile` | `ProfileComponent` | Ver perfil, editar datos, cambiar contraseña, gestionar sesiones activas |
| `/rutas` | `RutasComponent` | Mapa Leaflet con rutas de transporte, planificación, marcadores de paradas |
| `/movilidad/boletos` | `BoletosComponent` | Compra y gestión de boletos/tiquetes. Tabla con botón 🗺️ por fila que navega al detalle. |
| `/movilidad/boletos/:id` | `DetalleViajeComponent` | **HU-2005.** Detalle de un viaje: mapa Leaflet con polyline de la ruta completa, marcador verde en paradero de abordaje y rojo en descenso, panel lateral con hora de abordaje (`programacion.fecha + horaSalida`), hora de descenso (`boleto.horaFin`), duración calculada, placa/modelo del bus y nombre del conductor. Llama a `GET /boleto/:id` y luego `GET /ruta/:rutaId/paraderos`. Ubicación: `features/boletos/detalle-viaje/`. |

### Admin (requieren `authGuard` + `roleGuard`)
| Ruta | Componente | Descripción |
|---|---|---|
| `/admin` | `AdminDashboardComponent` | Panel de administración con resumen |
| `/admin/users` | `UserListComponent` | CRUD de usuarios |
| `/admin/user-roles/:id` | `UserRoleManagerComponent` | Asignar/quitar roles a un usuario |
| `/admin/roles` | `RoleListComponent` | Listado de roles |
| `/admin/roles/new` | `RoleFormComponent` | Crear nuevo rol |
| `/admin/roles/edit/:id` | `RoleFormComponent` | Editar rol existente |
| `/admin/permissions` | `PermissionListComponent` | Listado de permisos |
| `/admin/permissions/new` | `PermissionFormComponent` | Crear permiso |
| `/admin/permissions/edit/:id` | `PermissionFormComponent` | Editar permiso |
| `/admin/role-permissions` | `RolePermissionManagerComponent` | Asignar permisos a roles |
| `/admin/sessions` | `SessionListComponent` | Ver y cerrar sesiones activas de todos los usuarios |

---

## Componentes reutilizables disponibles

| Componente | Ubicación | Uso |
|---|---|---|
| `NavbarComponent` | `shared/components/navbar/` | Barra superior con menú de usuario, notificaciones, toggle de tema y logout. Emite `menuToggle` para el sidenav. |
| `SkeletonLoaderComponent` | `shared/components/loader/` | Estado de carga tipo skeleton. Se usa mientras llegan datos del API. Inputs: `type` (`text`/`circle`/`card`/`stat`/`action`), `width`, `height`, `lines`, `delay`. |
| `EmptyStateComponent` | `shared/components/empty-state.component.ts` | Muestra mensaje cuando no hay datos que listar. Inputs: `icon`, `title`, `subtitle`, `variant` (`default`/`compact`/`inline`). Acepta contenido proyectado (`<ng-content>`) para botones de acción. |
| `CountUpDirective` | `shared/models/count-up.directive.ts` | Directiva que anima un número del 0 al valor final. Usada en stats del dashboard. |
| `ProximamenteComponent` | `shared/components/proximamente/` | Página stub genérica para rutas aún no implementadas. Lee el título desde `route.snapshot.data['titulo']`. Usar con `loadComponent` + `data: { titulo: 'Nombre Sección' }`. |

**Servicios reutilizables de UI:**
- `ToastService` → `success()`, `error()`, `warning()`, `info()` — SnackBar de Material, 4.5s, posición top-right.
- `ThemeService` → toggle dark/light, persiste en localStorage, expone `isDarkMode$`.
- `NotificationService` → notificaciones en-app, máx 20, persistidas en localStorage, marcables como leídas.

---

## Variables de entorno necesarias (URLs de los microservicios)

Definidas en `src/environments/`:

```typescript
// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5050/api',       // Spring Boot — auth, usuarios, roles
  negocioUrl: 'http://localhost:3000',        // NestJS — rutas, boletos, planificación
  recaptchaSiteKey: '6Lc_TKgsAAAAAIExjkRjqGLU8yiATxAAr0TcbilD',
  securityLogsEnabled: true
};

// environment.prod.ts (producción)
export const environment = {
  production: true,
  apiUrl: 'https://tu-backend-produccion.com/api',
  recaptchaSiteKey: '6Lc_TKgsAAAAAIExjkRjqGLU8yiATxAAr0TcbilD',
  securityLogsEnabled: false
  // negocioUrl no está definido en prod — debe agregarse
};
```

| Variable | Descripción |
|---|---|
| `apiUrl` | URL base del backend Spring Boot (seguridad, auth, perfiles) |
| `negocioUrl` | URL base del backend NestJS (rutas de transporte, boletos) |
| `recaptchaSiteKey` | Clave pública de reCAPTCHA v3 para formularios de auth |
| `securityLogsEnabled` | Activa logs de seguridad en consola (solo desarrollo) |

---

## Convenciones de código que usa el proyecto (nombres, estructura de componentes)

### Nomenclatura
- **Componentes**: PascalCase con sufijo `Component` → `LoginComponent`, `RoleFormComponent`
- **Servicios**: PascalCase con sufijo `Service` → `AuthService`, `BoletoService`
- **Guards**: camelCase con sufijo `Guard` → `authGuard`, `roleGuard`
- **Interfaces**: PascalCase sin prefijos → `User`, `Role`, `LoginRequest`, `LoginResponse`
- **Variables/propiedades**: camelCase → `currentUser`, `isLoading`
- **Observables**: camelCase con sufijo `$` → `currentUser$`, `isDarkMode$`
- **Métodos privados**: camelCase, sin prefijo `_` → `loadUserData()`, `initializeForm()`
- **Archivos**: kebab-case → `auth.service.ts`, `role-form.component.ts`

### Estructura estándar de un componente
```typescript
@Component({
  selector: 'app-nombre',
  standalone: true,                          // Siempre standalone (Angular 19)
  imports: [CommonModule, MatXxxModule, ...], // Imports directos, sin módulo intermedio
  templateUrl: './nombre.component.html',
  styleUrl: './nombre.component.scss'
})
export class NombreComponent implements OnInit {
  // 1. Propiedades de estado
  data: Tipo | null = null;
  isLoading = true;

  // 2. Constructor con inyección
  constructor(
    private servicio: ServicioService,
    private router: Router
  ) {}

  // 3. Ciclo de vida
  ngOnInit(): void {
    this.cargarDatos();
  }

  // 4. Métodos privados de carga
  private cargarDatos(): void {
    this.servicio.getAll().subscribe({
      next: (res) => { this.data = res; this.isLoading = false; },
      error: (err) => { this.isLoading = false; }
    });
  }

  // 5. Getters computados
  get esAdmin(): boolean {
    return this.roles.includes('Administrador Sistema');
  }

  // 6. Manejadores de eventos (acción del usuario)
  onGuardar(): void { ... }
  onEliminar(id: string): void { ... }
}
```

### Estructura estándar de un servicio
```typescript
@Injectable({ providedIn: 'root' })
export class EntidadService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Entidad[]>       { return this.api.get<Entidad[]>('/entidades'); }
  getById(id: string): Observable<Entidad> { return this.api.get<Entidad>(`/entidades/${id}`); }
  create(dto: CreateDto): Observable<Entidad> { return this.api.post<Entidad>('/entidades', dto); }
  update(id: string, dto: CreateDto): Observable<Entidad> { return this.api.put<Entidad>(`/entidades/${id}`, dto); }
  delete(id: string): Observable<void>  { return this.api.delete<void>(`/entidades/${id}`); }
}
```

### Formularios
- Se usa **Reactive Forms** (`FormBuilder`, `FormGroup`, `Validators`).
- El formulario se inicializa en un método privado `initializeForm()` llamado desde el constructor.
- Los controles se exponen como getters para el template: `get email() { return this.form.get('email'); }`.
- Validación en `onSubmit()` con `if (this.form.invalid) return;`.

### Patrones RxJS
- `subscribe()` siempre con objeto `{ next, error }` — nunca solo callback.
- `BehaviorSubject` para estado compartido entre componentes.
- `forkJoin()` para múltiples peticiones paralelas.
- `firstValueFrom()` para convertir Observable a Promise cuando se necesita async/await.

### Routing
- Todas las rutas usan `loadComponent()` para lazy loading.
- Rutas hijas de admin definidas en `admin.routes.ts` separado.
- Fallback `**` redirige a `/dashboard`.
- El grupo `movilidad` en `app.routes.ts` tiene `canActivate: [authGuard]` en el padre; los hijos heredan esa protección sin repetirla.
- El `roleGuard` lee `route.data?.['roles']` (array de strings). **El chequeo es case-sensitive**: si el rol en la base de datos es `'CIUDADANO'`, la ruta debe declarar `data: { roles: ['CIUDADANO'] }`, no `'Ciudadano'`. Cuando una ruta aplica para cualquier usuario autenticado sin importar rol, usar solo `authGuard` y dejar la autorización al API.

### Leaflet en componentes con `*ngIf`
- El `div` del mapa **no puede existir en el DOM** hasta que `*ngIf` se resuelva a `true`.
- Patrón correcto: usar `@ViewChild('ref') set ref(el)` — el setter se dispara automáticamente cuando el elemento aparece en el DOM y se llama `initMap()` ahí dentro con `NgZone.runOutsideAngular()`.
- Siempre llamar `this.mapa?.remove()` en `ngOnDestroy()` para evitar memory leaks.
- Los iconos personalizados se crean con `L.divIcon` usando HTML inline (ver `DetalleViajeComponent` y `RutasComponent`).
- El fix de iconos por defecto de Leaflet va al nivel de módulo (fuera de la clase): `delete (L.Icon.Default.prototype as any)._getIconUrl` + `L.Icon.Default.mergeOptions(...)`.

### Llamadas al backend NestJS desde componentes
- Usar `ApiService` (no `HttpClient` directo) para que el JWT se adjunte automáticamente.
- `ApiService.buildUrl()` detecta si el endpoint empieza con `http` y lo usa tal cual, por lo que se puede hacer: `this.api.get(\`${environment.negocioUrl}/boleto/${id}\`)`.
- **No** usar `BoletosService` ni servicios legacy que usan `HttpClient` directo sin token — migrar progresivamente a `ApiService`.

### Idioma
- Todo el código de UI, mensajes de error, labels y comentarios están en **español**.

---

## Historial de páginas construidas por sesión

### Sesión — HU-2005 (DetalleViajeComponent)
- **Creado:** `features/boletos/detalle-viaje/` (3 archivos: `.ts`, `.html`, `.scss`)
- **Ruta:** `/movilidad/boletos/:id` — hijo del grupo `movilidad` con `authGuard` heredado del padre.
- **Flujo de datos:** `GET /boleto/:id` → extrae `programacion.ruta.id` → `GET /ruta/:rutaId/paraderos` → dibuja mapa.
- **Navegación hacia el detalle:** botón ícono 🗺️ (`mat-icon-button` con `[routerLink]`) en la columna Acciones de `BoletosComponent`.
- **Creado:** `shared/components/proximamente/proximamente.component.ts` — stub genérico para rutas futuras sin implementar aún.
