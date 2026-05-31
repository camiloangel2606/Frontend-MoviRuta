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

## Roles del sistema (ms-security) — DEFINITIVOS

Los roles vienen del microservicio Spring Boot (`GET /api/user-role/my-roles`).  
**Formato: SCREAMING_SNAKE_CASE, siempre mayúsculas, comparación case-sensitive.**

### Tabla de roles

| Rol | Descripción | Acceso en sidebar |
|---|---|---|
| `CIUDADANO` | Usuario regular de la plataforma. Rol por defecto al registrarse. | Grupo Ciudadano |
| `CONDUCTOR` | Ofrece servicios de transporte. | Grupo Conductor |
| `ADMIN_EMPRESA` | Gestión operativa de la empresa. | Grupos Administración + Reportes |
| `SUPERVISOR` | Supervisa operaciones. | Grupos Administración + Reportes |
| `ADMIN` | Administrador general del sistema. Acceso total. | Todos los grupos admin + Sistema |

> **`ADMIN`** es el único rol que ve el grupo **Sistema** (Usuarios, Roles, Permisos, Sesiones).  
> **`SUPERVISOR`** ve las mismas secciones operativas que `ADMIN_EMPRESA` pero no tiene acceso a Sistema.  
> **`CIUDADANO`** y **`CONDUCTOR`** son grupos completamente separados — un usuario puede tener ambos roles si el negocio lo requiere.

### Cómo se cargan los roles en el frontend

```
Login (verify-2fa) o refresh con token válido
  └─ getMyRoles() → GET /api/user-role/my-roles → { "roles": ["CONDUCTOR"] }
        └─ AuthService.setUserRoles(roles)
              ├─ localStorage['userRoles'] = JSON.stringify(roles)
              └─ userRoles$ BehaviorSubject.next(roles)

AppComponent (constructor)
  └─ authService.userRoles$.subscribe → this.userRoles = roles
        └─ hasAnyRole(group.roles) reevalúa *ngIf de cada grupo

AppComponent (ngOnInit) — safety net
  └─ Si autenticado Y getUserRoles().length === 0 → getMyRoles()
     (cubre navegación directa con token en localStorage pero sin roles cacheados)
```

---

## Sidebar — Navegación lateral (AppComponent)

El sidenav vive en `src/app/app.component.ts` / `.html`. **No** es un componente separado — inline en el shell raíz con `<mat-sidenav>` de Angular Material.

### Estructura navGroups
```typescript
interface NavGroup {
  label: string;     // '' = sin encabezado de sección
  roles: string[];   // [] = visible para cualquier usuario autenticado
  items: NavItemDef[];
}
```

`hasAnyRole(roles)` → si el array está vacío siempre devuelve `true`. Si tiene roles, devuelve `true` si el usuario tiene AL MENOS UNO.

### Estado actual de grupos

| Grupo | `roles[]` | Ítems |
|---|---|---|
| *(General)* | `[]` — todos los autenticados | Dashboard, Perfil, Planificar Rutas, Mis Viajes |
| Ciudadano | `['CIUDADANO']` | Recargar Tarjeta |
| Conductor | `['CONDUCTOR']` | Mi Turno, Reportar Incidente |
| Administración | `['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']` | Flota de Buses, Paraderos, Rutas, Programaciones |
| Reportes | `['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']` | Ingresos, Demografía, Incidentes |
| Sistema | `['ADMIN']` | Usuarios, Roles, Permisos, Sesiones |

### Regla para agregar una nueva sección al sidebar

```
HU exclusiva para CONDUCTOR
  sidebar → grupo Conductor, roles: ['CONDUCTOR']
  ruta child → canActivate: [roleGuard], data: { roles: ['CONDUCTOR'] }

HU exclusiva para CIUDADANO
  sidebar → grupo Ciudadano, roles: ['CIUDADANO']
  ruta → canActivate: [authGuard, roleGuard], data: { roles: ['CIUDADANO'] }

HU para gestión operativa (empresa/supervisión)
  sidebar → grupo Administración o Reportes
  ruta → data: { roles: ['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR'] }

HU solo para ADMIN (configuración del sistema)
  sidebar → grupo Sistema
  ruta → data: { roles: ['ADMIN'] }

HU para todos los autenticados (sin restricción de rol)
  sidebar → grupo general (roles: [])
  ruta → solo canActivate: [authGuard], sin roleGuard
```

### Pasos para agregar un ítem
1. Identificar el rol de la HU → elegir el grupo en `navGroups` de `app.component.ts`.
2. Agregar `{ label: 'Texto', icon: 'material_icon', route: '/ruta' }` al array `items`.
3. Agregar la ruta en `app.routes.ts` (para `/ciudadano/**`, `/conductor/**`, `/movilidad/**`) o en `admin.routes.ts` (para `/admin/**`) con `loadComponent()` + guards usando los nombres de rol exactos en mayúsculas.

---

## Routing — grupos de rutas configurados

### `app.routes.ts` — grupos relevantes
```typescript
// Ciudadano (authGuard + roleGuard)
{ path: 'ciudadano', data: { roles: ['CIUDADANO'] }, children: [
  { path: 'tarjeta/recargar' }   // ProximamenteComponent
]}

// Conductor (authGuard + roleGuard — parent acepta admins/supervisor para supervisión)
{ path: 'conductor', data: { roles: ['CONDUCTOR', 'ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR'] }, children: [
  { path: 'dashboard' }          // DashboardConductorComponent (HU-2006)
  { path: 'incidente/nuevo',     // ReporteIncidenteComponent (HU-2007)
    canActivate: [roleGuard], data: { roles: ['CONDUCTOR'] } }  // child más restrictivo
]}

// Movilidad (authGuard heredado — sin roleGuard, visible para todos)
{ path: 'movilidad', children: [
  { path: 'boletos' }            // BoletosComponent
  { path: 'boletos/:id' }        // DetalleViajeComponent
]}

// Admin (authGuard + roleGuard)
{ path: 'admin', data: { roles: ['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR'] } }
```

### `admin.routes.ts` — constantes de roles
```typescript
const ADMIN_EMPRESA_ROLES = ['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']; // operativo
const ADMIN_SISTEMA_ROLES = ['ADMIN'];                                  // solo superadmin
```

### `admin.routes.ts` — rutas stub (usan `ProximamenteComponent`)
| Ruta | Roles | Título mostrado |
|---|---|---|
| `/admin/buses` | ADMIN_EMPRESA_ROLES | Flota de Buses |
| `/admin/paraderos` | ADMIN_EMPRESA_ROLES | Paraderos |
| `/admin/rutas` | ADMIN_EMPRESA_ROLES | Rutas |
| `/admin/programaciones` | ADMIN_EMPRESA_ROLES | Programaciones |
| `/admin/reportes/ingresos` | ADMIN_EMPRESA_ROLES | Reporte de Ingresos |
| `/admin/reportes/demografia` | ADMIN_EMPRESA_ROLES | Reporte Demográfico |
| `/admin/reportes/incidentes` | Empresa + Sistema | Reporte de Incidentes |

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
| `/movilidad/boletos` | `BoletosComponent` | Compra y gestión de boletos/tiquetes. Tabla con botón 🗺️ por fila que navega al detalle. Visible en sidebar para todos los autenticados. |
| `/movilidad/boletos/:id` | `DetalleViajeComponent` | **HU-2005.** Detalle de un viaje: mapa Leaflet con polyline de la ruta completa, marcador verde en paradero de abordaje y rojo en descenso, panel lateral con hora de abordaje (`programacion.fecha + horaSalida`), hora de descenso (`boleto.horaFin`), duración calculada, placa/modelo del bus y nombre del conductor. Llama a `GET /boleto/:id` y luego `GET /ruta/:rutaId/paraderos`. Ubicación: `features/boletos/detalle-viaje/`. |

### Conductor (requieren `authGuard` + `roleGuard` — roles: Conductor, admins)
| Ruta | Componente | Descripción |
|---|---|---|
| `/conductor/dashboard` | `DashboardConductorComponent` | **HU-2006.** Turno activo o próximo del conductor. Muestra bus asignado, ruta (de programación), hora de inicio. Botón "Iniciar Turno" si estado=PROGRAMADO → abre dialog con radio Operativo/Con observaciones + textarea condicional. Sección GPS cuando estado=EN_CURSO: activa `watchPosition`, envía coordenadas a `PATCH /gps/:id/posicion`. Ubicación: `features/conductor/dashboard/`. |
| `/conductor/incidente/nuevo` | `ReporteIncidenteComponent` | **HU-2007.** Formulario de reporte rápido: tipo, gravedad, descripción, hasta 5 fotos. Captura GPS con `getCurrentPosition` (redondeado a 7 decimales). Crea incidente vía `POST /incidente`, luego sube fotos con `POST /foto` usando el `id` devuelto. Dialog de confirmación para gravedad ALTA/CRITICA. Ubicación: `features/conductor/incidente/`. |
| `/ciudadano/tarjeta/recargar` | `ProximamenteComponent` | Stub — pendiente de implementar |

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
| `/admin/buses` | `ProximamenteComponent` | Stub — Flota de Buses (Empresa + Sistema) |
| `/admin/paraderos` | `ProximamenteComponent` | Stub — Paraderos (Empresa + Sistema) |
| `/admin/rutas` | `ProximamenteComponent` | Stub — Rutas (Empresa + Sistema) |
| `/admin/programaciones` | `ProximamenteComponent` | Stub — Programaciones (Empresa + Sistema) |
| `/admin/reportes/ingresos` | `ProximamenteComponent` | Stub — Reporte de Ingresos |
| `/admin/reportes/demografia` | `ProximamenteComponent` | Stub — Reporte Demográfico |
| `/admin/reportes/incidentes` | `IncidentesBusComponent` | **HU-2008 (modo general).** Lista todos los incidentes de la flota. 3 stats cards (total, tipo más frecuente, tasa resolución). Filtros cliente por tipo y estado. Tabla con columnas bus, fecha, conductor, tipo, gravedad (chip), estado. Click en fila abre MatDrawer lateral con datos completos, fotos, comentarios de sesión y cambio de estado vía PATCH. |
| `/admin/buses/:id/incidentes` | `IncidentesBusComponent` | **HU-2008 (modo bus).** Igual que el anterior pero filtrado por `busId` de la ruta. Sin entrada en sidebar — se navega desde Flota de Buses. |

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

## Servicios de dominio de negocio (NestJS)

### `TurnoService` — `src/app/features/conductor/turno.service.ts`

Servicio singleton para todo lo relacionado con conductores, turnos y GPS. Usa `ApiService` con `environment.negocioUrl` como base (`http://localhost:3000`).

**Interfaces exportadas:** `Persona`, `Bus`, `Conductor`, `Ruta`, `Programacion`, `Turno`, `Gps`

**Métodos:**

| Método | Endpoint NestJS | Notas |
|---|---|---|
| `getPersonaBySecurity(securityUserId)` | `GET /persona/security/:id` | Obtiene la Persona del usuario autenticado usando su UUID de Spring Boot |
| `getConductores()` | `GET /conductor` | Trae todos; se filtra client-side con `Number(c.persona?.id) === Number(persona.id)` |
| `getTurnosConductor(conductorId)` | `GET /turno/conductor/:conductorId` | Endpoint específico — devuelve solo los turnos del conductor, con conductor+bus anidados |
| `getProgramaciones()` | `GET /programacion` | Trae todas; se filtra client-side (el ValidationPipe rechaza params no declarados en el DTO) |
| `iniciarTurno(id, dto)` | `POST /turno/:id/iniciar` | `dto: { observaciones?: string }` → cambia estado a EN_CURSO |
| `getGps()` | `GET /gps` | Trae todos los dispositivos; se filtra client-side por `bus.id` |
| `actualizarPosicion(gpsId, lat, lng)` | `PATCH /gps/:id/posicion` | `{ latitud, longitud }` — llamado desde `watchPosition` del navegador |

**Lección aprendida — ValidationPipe estricto:**
> El backend NestJS rechaza con **400 Bad Request** cualquier query param que no esté en el DTO (`forbidNonWhitelisted: true`). NO enviar `?conductorId=X` a `/programacion` ni `?conductorAsignadoId=X` — esos campos no existen en `FindProgramacionQueryDto`. Siempre traer todo y filtrar en el frontend cuando los params del DTO no están documentados.

**Flujo de identificación conductor (DashboardConductorComponent):**
```
currentUser.id (UUID Spring Boot)
  → GET /persona/security/:id          → Persona { id: number }
  → GET /conductor (filtro client-side) → Conductor { id: number, persona: {...} }
  → GET /turno/conductor/:conductorId  → Turno[]
  → GET /programacion (filtro client)  → Programacion[]
```

> ⚠️ `persona.id` ≠ `conductor.id`. Siempre usar `conductor.id` para consultar turnos y programaciones. Usar `Number()` en comparaciones de IDs para evitar fallos por tipo string/number.

**Lógica de selección de turno (dashboard):**
- Se muestra el primer turno EN_CURSO (sin importar fecha) O el próximo PROGRAMADO (inicio >= ahora − 24h).
- El filtro de fecha exacta a "hoy" es demasiado restrictivo — los turnos pueden crearse para fechas futuras.

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

### Sesión — Sidebar global + Guards + Rutas stub
- **Refactorizado:** `app.component.ts` — `navItems[]` plano reemplazado por `navGroups[]` con `roles[]` por grupo. `hasAnyRole()` controla visibilidad reactivamente via `userRoles$`.
- **Importado:** `MatDividerModule` en AppComponent; `.nav-group-label` y `.nav-divider` en SCSS.
- **Nuevas rutas en `app.routes.ts`:** grupos `/ciudadano` y `/conductor` con `canActivate: [authGuard, roleGuard]`.
- **Actualizadas:** `/admin` ahora acepta `['Administrador Sistema', 'Administrador Empresa', 'ADMIN']`.
- **Nuevas rutas en `admin.routes.ts`:** 7 stubs con `ProximamenteComponent` (buses, paraderos, rutas, programaciones, reportes/*).
- **`roleGuard`:** ya estaba correcto — lee `route.data?.['roles']` y compara con `auth.getUserRoles()`.

### Sesión — HU-2006 (DashboardConductorComponent)
- **Creado:** `features/conductor/turno.service.ts` — interfaces + 7 métodos HTTP hacia NestJS.
- **Creado:** `features/conductor/dashboard/dashboard-conductor.component.ts/html/scss`
- **Creado:** `features/conductor/dashboard/iniciar-turno-dialog/iniciar-turno-dialog.component.ts` (standalone con template inline)
- **Flujo:** persona → conductor → `GET /turno/conductor/:id` → `GET /programacion` (filtro client-side).
- **Dialog iniciar turno:** `MatRadioGroup` (Operativo / Con observaciones) + `valueChanges` para mostrar/ocultar textarea → `POST /turno/:id/iniciar`.
- **GPS (EN_CURSO):** `navigator.geolocation.watchPosition()` → `PATCH /gps/:id/posicion`. `clearWatch()` en `ngOnDestroy`.
- **Sidebar:** "Mis Viajes" movido al grupo general (visible para todos). Grupo Conductor visible también para admins.
- **Errores resueltos:**
  - Import path dialog (`'../turno.service'` → `'../../turno.service'`).
  - 400 Bad Request en `/programacion` por params no declarados en DTO → traer todo sin params.
  - Turno no encontrado → filtro client-side faltaba comparar `conductor.id`; usar `Number()` en comparaciones de ID.
  - Fecha "hoy" demasiado restrictiva → mostrar próximo PROGRAMADO sin límite de fecha exacta.

### Sesión — HU-2007 (ReporteIncidenteComponent)
- **Implementado:** `features/conductor/incidente/reporte-incidente.component.ts/html/scss` (reemplaza stub).
- **GPS:** `navigator.geolocation.getCurrentPosition()` en `ngOnInit`, timeout 10s. Resultado en `coordenadasActuales`. **Redondear a 7 decimales** con `parseFloat(val.toFixed(7))` antes de enviar — el DTO del backend valida `maxDecimalPlaces: 7`.
- **Fotos:** flujo async en `enviarReporte()`: crea incidente → captura `incidente.id` → convierte cada File a base64 data-URL con `FileReader` → `POST /foto` con `{ incidenteId, url }` por cada foto. `Promise.allSettled` para no bloquear si alguna falla.
- **Agregado a `TurnoService`:** `crearFoto(dto: { incidenteId, url })` → `POST /foto`.
- **Errores resueltos:**
  - 400 en `POST /incidente` por coordenadas con >7 decimales → `parseFloat(val.toFixed(7))`.
  - `GET /incidente` devuelve `{ data: [], total, page, limit }` (paginado), no array plano → usar `normalizar<T>()` que extrae `.data` si existe.

### Sesión — HU-2008 (IncidentesBusComponent)
- **Creado:** `features/admin/components/incidentes-bus/` + `services/incidente-bus.service.ts`.
- **Ruta sidebar:** `/admin/reportes/incidentes` → modo general (todos los buses). **Ruta drill-down:** `/admin/buses/:id/incidentes` → modo bus (filtrado por `busId`). Ambas con `canActivate: [authGuard, roleGuard]`, `data: { roles: ADMIN_EMPRESA_ROLES }` (`['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']`).
- **Getter `modoBus`:** `busId > 0` → filtra incidentes; `busId === 0` → muestra todos.
- **Helper `normalizar<T>(respuesta)`:** maneja tanto array plano como `{ data: T[] }` paginado.
- **Errores resueltos:**
  - Selector de `SkeletonLoaderComponent` es `app-skeleton`, no `app-skeleton-loader`.
  - Roles de ruta deben ser `ADMIN_EMPRESA_ROLES` — strings como `'Administrador Sistema'` no coinciden con los roles reales del backend.
