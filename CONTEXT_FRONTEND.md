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
| `/movilidad/boletos` | `BoletosComponent` | Compra y gestión de boletos/tiquetes. Tabla con botón 🗺️ por fila que navega al detalle. Visible en sidebar para todos los autenticados. **Filtra programaciones activas client-side** (`estado !== 'FINALIZADO' && estado !== 'CANCELADO'`) — el dropdown solo muestra programaciones en `PROGRAMADO`/`EN_CURSO`. Al abrir modal de descenso valida que `boleto.programacion?.id` exista antes de llamar `GET /programacion/:id` (evita el error 400 con `undefined`). |
| `/movilidad/boletos/:id` | `DetalleViajeComponent` | **HU-2005.** Detalle de un viaje: mapa Leaflet con polyline de la ruta completa, marcador verde en paradero de abordaje y rojo en descenso, panel lateral con hora de abordaje (`programacion.fecha + horaSalida`), hora de descenso (`boleto.horaFin`), duración calculada, placa/modelo del bus y nombre del conductor. Llama a `GET /boleto/:id` y luego `GET /ruta/:rutaId/paraderos`. **⚠️ Importante:** las coordenadas `latitud`/`longitud` llegan como STRING (TypeORM serializa `decimal` así) — siempre hacer `parseFloat()` antes de pasar a Leaflet. Ubicación: `features/boletos/detalle-viaje/`. |

### Conductor (requieren `authGuard` + `roleGuard` — roles: Conductor, admins)
| Ruta | Componente | Descripción |
|---|---|---|
| `/conductor/dashboard` | `DashboardConductorComponent` | **HU-2006.** Turno del día del conductor. Flujo simplificado sin paso "Crear Turno": si hay programación para hoy y no existe turno, muestra botón **"Iniciar Turno"** que crea el turno silenciosamente (`POST /turno`) usando datos de la programación y luego abre el diálogo de confirmación. Si el turno ya existe en estado PROGRAMADO → botón "Iniciar Turno" directo. EN_CURSO → GPS card + "Finalizar Turno". FINALIZADO → banner de cierre. Pide solo turnos activos al backend con `getTurnosConductor(id, ['PROGRAMADO', 'EN_CURSO'])`. **Lógica de selección del turno relevante:** 1º EN_CURSO si existe, 2º próximo PROGRAMADO futuro (`inicio >= now`), 3º último PROGRAMADO pasado (para que el conductor pueda cerrarlo manualmente). **Lógica de selección de programación del día:** filtra primero `estado !== 'FINALIZADO' && estado !== 'CANCELADO'`, luego prefiere la próxima por `horaSalida >= ahora`. Programaciones filtradas client-side (`GET /programacion` sin params, filtra por conductorId y fecha local). Fecha calculada con `getFullYear/getMonth/getDate` (no `toISOString`) para evitar desfase UTC-5. Ubicación: `features/conductor/dashboard/`. |
| `/conductor/incidente/nuevo` | `ReporteIncidenteComponent` | **HU-2007.** Formulario de reporte rápido: tipo, gravedad, descripción, hasta 5 fotos. Captura GPS con `getCurrentPosition` (redondeado a 7 decimales). Crea incidente vía `POST /incidente`, luego sube fotos con `POST /foto` usando el `id` devuelto. Dialog de confirmación para gravedad ALTA/CRITICA. Ubicación: `features/conductor/incidente/`. |
| `/ciudadano/tarjeta/recargar` | `RecargaTarjetaComponent` | **HU-2013.** Recarga de tarjeta del ciudadano vía pasarela ePayco (modo redirección — el frontend NUNCA maneja datos de tarjeta). Carga la tarjeta activa del ciudadano en `ngOnInit` haciendo `GET /persona/security/:id` → `GET /metodo-pago-ciudadano?ciudadanoId=X` (toma el primer resultado). Muestra saldo actual con `CurrencyPipe` COP. 4 botones de montos predefinidos ($10K, $20K, $50K, $100K) + `MatFormField` para monto personalizado con `Validators.min(5000)` + `Validators.max(500000)`. Panel de resumen reactivo (saldo actual, monto, saldo futuro). Al click en "Continuar al pago": `POST /pagos/referencia { tarjetaId, monto }` → carga `https://checkout.epayco.co/checkout.js` dinámicamente con `data-epayco-key` → `ePayco.checkout.configure({key, test})` retorna `handler` → `handler.open({ name, description, invoice, currency: 'cop', amount, response, confirmation, ... })`. URLs `response` y `confirmation` apuntan a `environment.epayco.webhookBaseUrl` (ngrok en dev, dominio real en prod). **Polling de saldo:** después de abrir el checkout corre `setInterval` cada 3s durante 5 minutos llamando a `GET /metodo-pago-ciudadano?ciudadanoId=X`; cuando detecta que el saldo cambió → muestra toast "Saldo actualizado: $X" + resetea form + detiene polling. Adicionalmente `@HostListener('window:focus')` refresca el saldo cuando el usuario vuelve a la pestaña tras pagar. Ubicación: `features/boletos/recarga-tarjeta/`. Modelos en `shared/models/tarjeta.models.ts` (`TarjetaActiva`, `ReferenciaTransaccion`). |

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
| `/admin/buses` | `FlotaBusesComponent` | **HU-2012.** Tabla de buses con 4 stats cards (total, operativos, mantenimiento, fuera de servicio). Columnas: placa/código (`BUS-XXXX`), modelo/empresa, año, capacidad, estado (chip). Click en fila → `DetalleBusDialogComponent`: info completa, QR del bus (`BUS-{id}:{placa}` vía `angularx-qrcode`), cambio de estado inline (MatSelect + `PATCH /bus/:id`), botón "Editar bus" (abre `RegistrarBusDialogComponent` en modo edición con form precargado, `PATCH /bus/:id`) y botón "Eliminar" con confirmación inline (`DELETE /bus/:id`). Tras registrar un bus nuevo también abre el detalle/QR. Botón "Incidentes" en la fila navega a `/admin/buses/:id/incidentes` (stopPropagation para no abrir el detalle). `BusService` (`features/admin/services/bus.service.ts`): `getBuses`, `crearBus`, `actualizarBus`, `eliminarBus`, `getEmpresas`. Roles: `ADMIN`, `ADMIN_EMPRESA`. |
| `/admin/paraderos` | `GestionParaderosComponent` | **HU-2010.** Tabla de paraderos con buscador en tiempo real (filtra nombre y tipo con `valueChanges + debounceTime`). Columnas: nombre, código (`PAR-XXXX`), tipo (badge de color), latitud, longitud. Stats: total y terminales. Botón "Nuevo Paradero" → dialog dos paneles: formulario (nombre, tipo MatSelect, lat/lng readonly) + mapa Leaflet interactivo. Clic en mapa coloca/mueve un único marcador y hace `patchValue()` con coordenadas redondeadas a 7 decimales. `POST /paradero`. `ParaderoService` en `features/admin/services/`. Roles: `ADMIN`, `ADMIN_EMPRESA`. |
| `/admin/rutas` | `GestionRutasComponent` | **HU-2009.** Tabla de rutas con código, tarifa y conteo de paraderos. Botón "Nueva Ruta" → dialog con form reactivo, autocomplete de paraderos, reordenamiento ↑↓, campos distancia/tiempo y mapa Leaflet en tiempo real. `POST /ruta/con-paraderos`. Roles: `ADMIN`, `ADMIN_EMPRESA`. |
| `/admin/programaciones` | `ProgramacionesComponent` | **HU-2011.** Tabla de programaciones con columnas ruta/bus/conductor/fecha/horaSalida/estado/recurrencia. Stats cards. Filtro por estado (MatSelect). Botón "Nueva Programación" → dialog con `provideNativeDateAdapter()`: rutaId, busId, conductorId, fecha (DatePicker), horaSalida (time input), toleranciaMinutos (default 5), tipoRecurrencia (MatRadioGroup DIARIA/LUNES_A_VIERNES/FINES_DE_SEMANA) controlado por MatSlideToggle `esRecurrente`. **Verificación de conflictos client-side**: al cambiar busId/conductorId/fecha consulta programaciones existentes y bloquea si alguna se solapa (±toleranciaMinutos). **Una programación en estado `FINALIZADO` o `CANCELADO` NO bloquea** — se considera que el bus/conductor quedó libre, por lo que se pueden reutilizar. Solo bloquean las que están en `PROGRAMADO`/`EN_CURSO`. `POST /programacion`. Roles: `ADMIN`, `ADMIN_EMPRESA`. |
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
| `getTurnosConductor(conductorId, estados?)` | `GET /turno/conductor/:conductorId?estados=PROGRAMADO,EN_CURSO` | Acepta segundo parámetro opcional `estados: string[]` que se serializa como query param separado por coma. El backend filtra; si el backend aún no soporta el filtro, devuelve todos los turnos y el frontend filtra igualmente. |
| `getProgramaciones()` | `GET /programacion` | Trae todas sin params; el ValidationPipe rechaza query params no declarados en el DTO |
| `getProgramacionesConductorFecha(conductorId, fecha)` | `GET /programacion` (filtro client-side) | No envía params al backend. Filtra por `conductorAsignado.id` y `p.fecha.substring(0,10) === fecha` |
| `actualizarEstadoProgramacion(programacionId, estado)` | `PATCH /programacion/:id` | `{ estado }` — sincroniza estado de la programación cuando el conductor inicia o finaliza turno |
| `crearTurno(dto)` | `POST /turno` | `{ conductorId, busId, inicio: ISOString, observaciones? }` — usado en auto-creación silenciosa desde dashboard |
| `iniciarTurno(id, dto)` | `POST /turno/:id/iniciar` | `dto: { observaciones?: string }` → cambia estado a EN_CURSO |
| `finalizarTurno(id)` | `POST /turno/:id/finalizar` | Sin body → cambia estado a FINALIZADO |
| `getBuses()` | `GET /bus` | Trae todos; se filtra OPERATIVOS client-side en `CrearTurnoDialog` |
| `getGps()` | `GET /gps` | Trae todos los dispositivos; se filtra client-side por `bus.id` |
| `actualizarPosicion(gpsId, lat, lng)` | `PATCH /gps/:id/posicion` | `{ latitud, longitud }` — llamado desde `watchPosition` del navegador |
| `crearIncidente(dto)` | `POST /incidente` | Ver HU-2007 |
| `crearFoto(dto)` | `POST /foto` | `{ incidenteId, url }` — foto en base64 data-URL |

**Lección aprendida — ValidationPipe estricto:**
> El backend NestJS rechaza con **400 Bad Request** cualquier query param que no esté en el DTO (`forbidNonWhitelisted: true`). NO enviar `?conductorId=X` a `/programacion` ni `?conductorAsignadoId=X` ni `?fecha=X` — esos campos no existen en `FindProgramacionQueryDto`. Siempre traer todo y filtrar en el frontend cuando los params del DTO no están documentados. Mismo patrón aplica a `/paradero` y potencialmente a otros endpoints no documentados.

**Lección aprendida — Fecha local vs UTC (Colombia UTC-5):**
> NUNCA usar `new Date().toISOString().split('T')[0]` para calcular la fecha de hoy — en Colombia después de las 7pm, `toISOString()` ya devuelve el día siguiente en UTC.  
> Usar: `const d = new Date(); \`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}\``  
> Al comparar fechas devueltas por la API usar `.substring(0, 10)` porque el backend puede devolver datetime completo (`"2026-06-06T00:00:00.000Z"`).

**Flujo de identificación conductor (DashboardConductorComponent):**
```
currentUser.id (UUID Spring Boot)
  → GET /persona/security/:id          → Persona { id: number }
  → GET /conductor (filtro client-side) → Conductor { id: number, persona: {...} }
  → GET /turno/conductor/:conductorId  → Turno[]
  → GET /programacion (filtro client)  → Programacion[]
```

> ⚠️ `persona.id` ≠ `conductor.id`. Siempre usar `conductor.id` para consultar turnos y programaciones. Usar `Number()` en comparaciones de IDs para evitar fallos por tipo string/number.

**Lógica de selección de turno (dashboard) — versión vigente:**
- Prioridad: 1º EN_CURSO existente, 2º próximo PROGRAMADO con `inicio >= ahora`, 3º último PROGRAMADO pasado (para permitir cierre manual de turnos olvidados).
- `FINALIZADO` y `CANCELADO` SIEMPRE se excluyen. Se pide al backend solo `?estados=PROGRAMADO,EN_CURSO` para ahorrar tráfico.

**Lógica de selección de programación del día (dashboard):**
- Filtra `progsActivas = programaciones.filter(p => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO')`.
- Si hay turno EN_CURSO → empareja por `bus.id`. Si no, prefiere `proximaProgFutura = progsActivas.find(p => p.horaSalida >= "HH:MM:00")`. Fallback al último activo del día.

**Tipos de fecha en CSV vs API:**
- Una programación FINALIZADA en la BD tiene `updated_at` posterior y `estado = 'FINALIZADO'`. El frontend respeta ese estado — no se compara contra hora actual para decidir si "ya pasó".

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
  securityLogsEnabled: true,
  epayco: {
    publicKey: '68362615c6bd7a4f53aac3a7db80248e',
    p_cust_id_cliente: '1583948',
    p_key: '85d9be539ada27ad0b8e9a05805d7e23a3f16af',
    test: true,                               // true en sandbox, false en producción
    checkoutUrl: 'https://checkout.epayco.co/checkout.js',
    webhookBaseUrl: 'https://xxx.ngrok-free.dev' // URL pública para que ePayco
                                                  // alcance /pagos/respuesta y
                                                  // /pagos/confirmacion. En dev usar ngrok.
  }
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
| `epayco.publicKey` | Clave pública del comercio en ePayco (frontend) |
| `epayco.p_cust_id_cliente` | ID de cliente ePayco (necesario para verificación de firma en backend) |
| `epayco.p_key` | Llave privada del comercio (DEBE estar también en backend `.env` como `EPAYCO_P_KEY`) |
| `epayco.test` | `true` = sandbox (tarjetas de prueba), `false` = producción |
| `epayco.checkoutUrl` | URL del script JS de ePayco que se carga dinámicamente |
| `epayco.webhookBaseUrl` | URL pública para que ePayco envíe los webhooks (`/pagos/respuesta`, `/pagos/confirmacion`). En dev → ngrok. En prod → dominio público del backend. |

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

### Layout del shell — navbar fijo y offset de contenido

El navbar (`.topbar` en `navbar.component.scss`) es `position: fixed`, `height: 84px`, `z-index: 1200`. Flota sobre todo el contenido.

**Corrección global aplicada en `app.component.scss`:**
```scss
.app-content-inner {
  min-height: 100vh;
  padding-top: 84px;   // ← empuja el contenido de TODAS las páginas debajo del navbar
}
```
> El `.app-sidenav` ya tenía `padding-top: 88px` (correcto desde antes).

**Regla para nuevas páginas:** los componentes de página NO necesitan agregar su propio `padding-top` para el navbar — `.app-content-inner` ya lo absorbe. Solo usar el `padding` propio de la página (ej. `padding: 24px`).

**MatDialog con navbar fijo:** al abrir un dialog desde una página, usar siempre:
```typescript
this.dialog.open(MiDialogComponent, {
  width: '...',
  maxWidth: '96vw',
  maxHeight: 'calc(100vh - 100px)',  // 100px = 84px navbar + 16px margen inferior
  position: { top: '92px' },         // 84px navbar + 8px margen visual
  disableClose: true,
});
```
Sin `position.top`, el dialog se centra en el viewport y su mitad superior queda tapada por el navbar.

**CSS interno de un MatDialog:** el `<mat-dialog-content>` nunca debe tener `overflow: hidden` — usar `overflow-y: auto` para que el formulario pueda hacer scroll. Las alturas internas deben usar `calc(100vh - Xpx)` en lugar de valores `vh` absolutos que no consideran el navbar ni los action-buttons.

---

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

### Sesión — HU-2009 (GestionRutasComponent)
- **Creado:** `features/admin/components/gestion-rutas/` — `GestionRutasComponent` + `NuevaRutaDialogComponent` (subcarpeta `nueva-ruta-dialog/`).
- **Creado:** `features/admin/services/ruta.service.ts` — interfaces `Ruta`, `Paradero`, `ParaderoEnRuta`, `CrearRutaDto`. Métodos: `getRutas()`, `getParaderos()`, `getParaderosDeRuta(id)`, `crearRutaConParaderos(dto)`.
- **Ruta:** `/admin/rutas` en `admin.routes.ts` — `canActivate: [authGuard, roleGuard]`, `data: { roles: ['ADMIN', 'ADMIN_EMPRESA'] }`. Reemplaza el stub `ProximamenteComponent`.
- **Sidebar:** "Rutas" → `/admin/rutas` ya existía en el grupo Administración (`['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']`).
- **Tabla:** columnas `nombre`, `codigo` (`RUT-${id.padStart(4,'0')}`), `tarifa`, `paraderos` (conteo via `forkJoin` de `GET /ruta/:id/paraderos`). Stats: total rutas y tarifa promedio.
- **Dialog "Nueva Ruta":** layout dos paneles (`grid-template-columns: 1fr 1fr`). Izquierda: `FormGroup` (nombre required, descripcion, tarifa required min:0) + `MatAutocomplete` con `debounceTime(300)` filtrando `GET /paradero` client-side + `FormArray` de paraderos con ↑↓✕ + campos distancia/tiempo por paradero. Derecha: mapa Leaflet con marcadores numerados (`L.divIcon`) y `L.polyline` actualizados en tiempo real.
- **Validaciones:** mínimo 3 paraderos antes de guardar; duplicados bloqueados en `onParaderoSelected`.
- **Guardado:** `POST /ruta/con-paraderos` con `{ nombre, descripcion?, tarifa, paraderos: [{paraderoId, orden, distanciaDesdeAnterior?, tiempoEstimadoDesdeAnterior?}] }`. Al cerrar el dialog: `toast.success("Ruta X creada. Código: RUT-XXXX")`.
- **Leaflet en dialog:** inicialización con `ngAfterViewInit` + `setTimeout(400)` (espera animación de apertura). `NgZone.runOutsideAngular()` en toda operación Leaflet. Fix de iconos al nivel de módulo.
- **Gotcha GET /paradero:** no acepta query params (`?nombre=`). Siempre traer todo y filtrar client-side.
- **Errores resueltos:**
  - Navbar fijo (84px) cubría el header de la página → `padding-top: 84px` en `.app-content-inner` de `app.component.scss`.
  - Dialog solapaba el navbar → `position: { top: '92px' }` + `maxHeight: 'calc(100vh - 100px)'` en la config de apertura.
  - `overflow: hidden` en `mat-dialog-content` impedía scroll del formulario → cambiado a `overflow-y: auto`.
  - Alturas fijas en dialog SCSS reemplazadas por `calc(100vh - Xpx)` para adaptarse al viewport real.

### Sesión — HU-2008 (IncidentesBusComponent)
- **Creado:** `features/admin/components/incidentes-bus/` + `services/incidente-bus.service.ts`.
- **Ruta sidebar:** `/admin/reportes/incidentes` → modo general (todos los buses). **Ruta drill-down:** `/admin/buses/:id/incidentes` → modo bus (filtrado por `busId`). Ambas con `canActivate: [authGuard, roleGuard]`, `data: { roles: ADMIN_EMPRESA_ROLES }` (`['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']`).
- **Getter `modoBus`:** `busId > 0` → filtra incidentes; `busId === 0` → muestra todos.
- **Helper `normalizar<T>(respuesta)`:** maneja tanto array plano como `{ data: T[] }` paginado.
- **Errores resueltos:**
  - Selector de `SkeletonLoaderComponent` es `app-skeleton`, no `app-skeleton-loader`.
  - Roles de ruta deben ser `ADMIN_EMPRESA_ROLES` — strings como `'Administrador Sistema'` no coinciden con los roles reales del backend.

### Sesión — HU-2011 (ProgramacionesComponent)
- **Creado:** `features/admin/components/programaciones/programaciones.component.ts/html/scss` + `nueva-programacion-dialog/nueva-programacion-dialog.component.ts`.
- **Creado:** `features/admin/services/programacion.service.ts` — interfaces `Bus`, `Conductor`, `Programacion`, `CrearProgramacionDto`, `RecurrenciaEnum`, `EstadoProgramacion`. Métodos: `getProgramaciones()`, `getBuses()`, `getRutas()`, `getConductores()`, `crearProgramacion(dto)`.
- **Ruta:** `/admin/programaciones` en `admin.routes.ts` — reemplaza stub. `canActivate: [authGuard, roleGuard]`, `data: { roles: ['ADMIN', 'ADMIN_EMPRESA'] }`.
- **Tabla:** columnas ruta, bus, conductor, fecha, horaSalida, estado (chip), recurrencia. Stats: total, en curso y programadas.
- **Dialog "Nueva Programación":** `provideNativeDateAdapter()` en providers. FormGroup con `rutaId`, `busId`, `conductorId`, `fecha` (DatePicker), `horaSalida` (time input), `toleranciaMinutos` (default 5), `tipoRecurrencia`. Toggle `esRecurrente` fuera del form controla visibilidad del `MatRadioGroup` (DIARIA | LUNES_A_VIERNES | FINES_DE_SEMANA). Cuando `esRecurrente=false` → envía `UNICA`.
- **Detección de conflictos:** `valueChanges` en `busId` y `fecha` → `GET /programacion` sin params → filtra client-side por `bus.id`, `fecha` y `estado !== 'CANCELADO'` → si hay conflicto `busCtrl.setErrors({ conflicto: true })`.
- **Fecha del DatePicker:** convertida a `YYYY-MM-DD` con `formatFecha(date: Date)` usando `getFullYear/getMonth/getDate` local (no `toISOString`).
- **`TurnoService`:** añadido `actualizarEstadoProgramacion(programacionId, estado)` → `PATCH /programacion/:id` — usado por el dashboard del conductor al iniciar/finalizar turno.

### Sesión — HU-2006 actualización (auto-create turno + fixes fecha)
- **Eliminado:** paso "Crear Turno" del flujo del conductor. `CrearTurnoDialogComponent` ya no se importa en `DashboardConductorComponent`.
- **Nuevo flujo `abrirDialogoIniciar()`:** si `!turno && programacion` → crea turno silenciosamente con `{ conductorId, busId: programacion.bus.id, inicio: new Date().toISOString() }` → re-entra recursivamente con turno disponible → abre `IniciarTurnoDialogComponent`. Mientras espera muestra `isCreandoTurno=true` ("Preparando turno...").
- **Fix fecha local:** `cargarTurnoHoy()` usa `getFullYear/getMonth/getDate` en lugar de `toISOString().split('T')[0]` — corrección crítica para Colombia (UTC-5) donde después de las 7pm la fecha UTC ya es mañana.
- **Fix filtro programaciones:** `getProgramacionesConductorFecha` ya no envía query params (causaban 400 del ValidationPipe). Llama a `GET /programacion` sin params y filtra con `p.fecha.substring(0,10) === fecha` para tolerar formatos datetime completos de la API.
- **Eliminado:** getter `puedeCrear`, método `abrirDialogoCrearTurno()`, sección "Crear Nuevo Turno" del template.

### Sesión — HU-2012 (FlotaBusesComponent — CRUD completo)
- **Creado:** `features/admin/components/flota-buses/` — `FlotaBusesComponent` + `RegistrarBusDialogComponent` + `DetalleBusDialogComponent` (subcarpetas). `QrBusDialogComponent` reemplazado por `DetalleBusDialogComponent`.
- **Creado:** `features/admin/services/bus.service.ts` — interfaces `Bus` (sin campo foto — la entidad backend no lo tiene), `Empresa`, `CrearBusDto`, `ActualizarBusDto`. Métodos: `getBuses()` → `GET /bus`, `crearBus(dto)` → `POST /bus`, `actualizarBus(id, dto)` → `PATCH /bus/:id`, `eliminarBus(id)` → `DELETE /bus/:id`, `getEmpresas()` → `GET /empresa`.
- **Ruta:** `/admin/buses` en `admin.routes.ts` — `canActivate: [authGuard, roleGuard]`, `data: { roles: ['ADMIN', 'ADMIN_EMPRESA'] }`. Reemplaza el stub `ProximamenteComponent`.
- **RegistrarBusDialogComponent** — modo creación y modo edición controlados por `@Optional() @Inject(MAT_DIALOG_DATA)`. Si llega `{ bus }` en data → modo edición: precarga el form con `patchValue` (`capacidadSentados = bus.capacidadMaxima`, `capacidadParados = 0`), título "Editar Bus", llama `PATCH`. Si no llega data → modo creación, llama `POST`. Empresa auto-seleccionada solo en creación cuando hay 1 empresa.
- **DetalleBusDialogComponent** — muestra info completa + QR (`angularx-qrcode`, `qrdata = "BUS-{id}:{placa}"`). Cambio de estado: MatSelect (`ngModel`) + botón "Guardar" habilitado solo si `nuevoEstado !== bus.estado`, llama `PATCH /bus/:id { estado }`. Eliminar: botón → confirmar inline → `DELETE /bus/:id`. Editar: cierra dialog devolviendo `{ action: 'edit', bus }` para que el padre abra `RegistrarBusDialogComponent`. Cierre normal devuelve `null`.
- **Flujo en FlotaBusesComponent:** click en fila → `abrirDetalle(bus)` → si result `action=edit` → `abrirDialogoEditar(bus)` → toast + `cargarBuses()`; si `action=deleted` → toast + `cargarBuses()`. Tras registro exitoso: toast + `cargarBuses()` + `abrirDetalle(busNuevo)`. Botón "Incidentes" usa `event.stopPropagation()` para no abrir detalle.
- **Sin foto en buses** — `POST /bus` y `PATCH /bus/:id` solo aceptan `{ placa, modelo, anio, capacidadMaxima, empresaId, estado? }`. No enviar ni mostrar campo foto.

### Sesión — HU-2013 (RecargaTarjetaComponent + flujo ePayco)
- **Creado:** `features/boletos/recarga-tarjeta/recarga-tarjeta.component.ts/html/scss` (standalone).
- **Creado:** `shared/models/tarjeta.models.ts` con `TarjetaActiva { id, saldo, tipo }` y `ReferenciaTransaccion { referencia, monto, descripcion }`.
- **Ruta:** `/ciudadano/tarjeta/recargar` en `app.routes.ts` con `canActivate: [authGuard, roleGuard]`, `data: { roles: ['CIUDADANO'] }`. Reemplaza el stub `ProximamenteComponent` que estaba antes.
- **Sidebar:** "Recargar Tarjeta" → `/ciudadano/tarjeta/recargar` ya existía en el grupo Ciudadano (`['CIUDADANO']`).
- **Flujo de pago ePayco (modo redirección — el frontend nunca toca datos de tarjeta):**
  1. `ngOnInit` carga la tarjeta activa del ciudadano: `GET /persona/security/:securityUserId` → `GET /metodo-pago-ciudadano?ciudadanoId=X`. Toma el primer resultado.
  2. Al click "Continuar al pago": `POST /pagos/referencia { tarjetaId, monto }` → recibe `{ referencia, monto, descripcion }`.
  3. Carga `https://checkout.epayco.co/checkout.js` dinámicamente con atributo `data-epayco-key`. Si ya está en DOM lo reutiliza. `script.onload` → abrir checkout; `script.onerror` → toast "No se pudo conectar con la pasarela de pago".
  4. `const handler = ePayco.checkout.configure({key, test})` — **devuelve un handler nuevo, NO mutación in-place**. Llamar `ePayco.checkout.open(...)` directamente lanza `TypeError: ePayco.checkout.open is not a function`.
  5. `handler.open({ name, description, invoice, currency: 'cop', amount: String, response, confirmation, ... })`.
  6. `response` y `confirmation` apuntan a `environment.epayco.webhookBaseUrl` — URL pública (ngrok en dev) porque ePayco no puede alcanzar `localhost`.
- **Polling de saldo:** al abrir el checkout arranca `setInterval` cada 3s durante hasta 5 minutos (100 intentos) que llama `GET /metodo-pago-ciudadano?ciudadanoId=X`. Cuando detecta cambio de saldo → toast "Saldo actualizado: $X" + reset del form + `clearInterval`.
- **`@HostListener('window:focus')`:** refresca el saldo inmediatamente al volver a la pestaña, sin esperar al próximo tick del polling. Útil porque ePayco abre el checkout en modal que muchos navegadores tratan como pestaña separada.
- **UI:** saldo actual con `CurrencyPipe` COP, 4 botones de montos predefinidos (10K/20K/50K/100K) que marcan/desmarcan visualmente y actualizan el FormControl; campo personalizado con `Validators.min(5000)` + `Validators.max(500000)`; panel de resumen reactivo (saldo actual + monto = saldo futuro); MatCard de aviso "Pago seguro vía ePayco"; botón con spinner durante el `POST /pagos/referencia`.
- **`declare const ePayco: any`** al nivel de módulo para que TypeScript no se queje del objeto global cargado dinámicamente.
- **Endpoints en backend NestJS:** `POST /pagos/referencia` (genera invoice y guarda transacción), `POST /pagos/confirmacion` (webhook server-to-server, verifica firma SHA256 con `EPAYCO_CUST_ID`/`EPAYCO_P_KEY` del `.env` del backend, actualiza saldo si `x_response === 'Aceptada'`, retorna 200 siempre). `GET /pagos/respuesta` redirección del navegador (no actualiza saldo).
- **Errores resueltos:**
  - `TypeError: ePayco.checkout.open is not a function` → `configure()` devuelve handler, no muta. Usar `handler.open(...)`.
  - 404 inicial en `/pagos/referencia` → el módulo no existía en backend; se mandó prompt detallado para crearlo.
  - 200 OK en webhook pero saldo no cambia en BD → verificación de firma fallaba por mismatch entre `EPAYCO_P_KEY` del frontend y `.env` del backend. También requiere `app.use(express.urlencoded({ extended: true }))` en `main.ts` para parsear el body que envía ePayco.
  - Frontend mostraba saldo viejo aunque la BD ya estaba correcta → polling demasiado corto (60s); se subió a 5min + listener de focus.

### Sesión — Fix descenso de boleto (HU-ENTR-2-004) + abordaje con programación EN_CURSO
- **`BoletosComponent.onChangeParaderoDescenso`** — bug: botón "Confirmar Descenso" quedaba deshabilitado siempre. Causa: el `<select>` con `[ngValue]` numérico pone en `target.value` la forma interna de Angular (`"2: 10"`), y el handler hacía `Number("2: 10") → NaN` sobrescribiendo el valor bueno que `[(ngModel)]` ya guardaba (`10`). Fix: dejar que `[(ngModel)]` haga el trabajo y NO normalizar desde `target.value`. El handler queda vacío (solo se conserva para diagnóstico futuro).
- **`BoletosComponent.confirmarDescenso`** — el flujo correcto es `PATCH /boleto/:id { rutaParaderoDescensoId }`. El id es el del `RutaParadero` (la pivot), no el del paradero. Para construir la lista de paraderos posteriores no sirve `GET /ruta/:id/paraderos` (no devuelve el id de la pivot), se usa `GET /ruta-paradero` y se filtra client-side por `rutaId`.
- **Backend `boleto.service.ts` (NestJS)** — dos fixes:
  - `create()`: aceptar programación en `ACTIVO` **o** `EN_CURSO` (antes solo `ACTIVO`). El ciudadano debe poder subirse a un bus que ya está rodando.
  - `update()` (descenso): guardas defensivas para `boleto.programacion` y `rutaParaderoDescenso.ruta` nulos → `400 BadRequest` con mensaje claro en vez de `500 TypeError`. Esto evita el crash cuando un boleto antiguo tiene FKs huérfanas, pero NO repara el dato: para descenso usar boletos creados después del fix.

### Sesión — Fix bugs múltiples (selectores Mis Viajes, mapa detalle, conflictos programación, lógica turno conductor)
- **`BoletosComponent`** — bug: dropdowns vacíos porque pedía `?estado=ACTIVO` y el estado por defecto en BD es `PROGRAMADO`. Fix: quitar query param y filtrar client-side `estado !== 'FINALIZADO' && estado !== 'CANCELADO'` para mostrar solo programaciones activas.
- **`BoletosComponent.abrirModalDescenso`** — bug: `GET /programacion/undefined` cuando `boleto.programacion?.id` no existe → 400. Fix: validar `progId` antes de la petición; abrir modal vacío si no hay programación válida.
- **`DetalleViajeComponent`** — bug: mapa Leaflet vacío. Causa: TypeORM serializa `decimal(10,7)` como STRING, no number, y Leaflet ignora silenciosamente coordenadas string. Fix: `parseFloat(p.paradero.latitud as any)` y `parseFloat(p.paradero.longitud as any)` antes de construir polyline y markers. Guard `isNaN` antes de crear cada marker.
- **`NuevaProgramacionDialogComponent.tieneConflictoHorario`** — la validación de conflictos bloqueaba bus/conductor permanentemente si tenían cualquier programación previa con horario solapado. Fix: excluir también `FINALIZADO` del filtro (`estado !== 'CANCELADO' && estado !== 'FINALIZADO'`). Un recurso ocupado solo si la programación previa está activa.
- **`DashboardConductorComponent`** — bug: con turno PROGRAMADO de las 01:23 (pasado) y otro de las 02:00 (próximo) mostraba siempre el de las 01:23 porque ordenaba ascendente por inicio y tomaba `[0]`. Fix: nueva lógica de prioridad (EN_CURSO → próximo futuro → último pasado). También se aplicó misma lógica a la selección de la programación del día (excluye FINALIZADO/CANCELADO + prefiere `horaSalida >= ahoraHHMM`).
- **`TurnoService.getTurnosConductor(id, estados?)`** — segundo parámetro opcional para pedir solo turnos activos al backend (`?estados=PROGRAMADO,EN_CURSO`). Si el backend aún no implementa el filtro, devuelve todos los turnos y el frontend filtra igual.

### Sesión — HU-2010 (GestionParaderosComponent)
- **Creado:** `features/admin/components/gestion-paraderos/` — `GestionParaderosComponent` + `NuevoParaderoDialogComponent` (subcarpeta `nuevo-paradero-dialog/`).
- **Creado:** `features/admin/services/paradero.service.ts` — re-exporta `Paradero` desde `ruta.service.ts`, añade `getParaderos()` y `crearParadero(dto: CrearParaderoDto)` → `POST /paradero`.
- **Ruta:** `/admin/paraderos` en `admin.routes.ts` — `canActivate: [authGuard, roleGuard]`, `data: { roles: ['ADMIN', 'ADMIN_EMPRESA'] }`. Reemplaza el stub `ProximamenteComponent`.
- **Sidebar:** "Paraderos" → `/admin/paraderos` ya existía en el grupo Administración (`['ADMIN', 'ADMIN_EMPRESA', 'SUPERVISOR']`), sin cambios.
- **Tabla:** columnas `nombre`, `codigo` (`PAR-${id.padStart(4,'0')}`), `tipo` (badge de color por valor: azul/verde/naranja), `latitud`, `longitud`. Stats: total paraderos y conteo de terminales.
- **Buscador en tiempo real:** `FormControl` + `valueChanges` con `debounceTime(200)` filtrando `todosLosParaderos` por nombre y tipo sobre datos ya cargados (sin llamada extra al backend).
- **Dialog "Nuevo Paradero":** layout dos paneles (`grid-template-columns: 1fr 1fr`). Izquierda: `FormGroup` (nombre required, tipo MatSelect PARADERO|ESTACION|TERMINAL required, latitud y longitud `disabled: true`). Derecha: mapa Leaflet.
- **Mapa interactivo:** `mapa.on('click', ...)` registrado dentro de `runOutsideAngular`. Al hacer clic: si ya existe marcador → `marcador.setLatLng(...)` (solo uno a la vez); si no → `L.marker(...).addTo(mapa)`. Coordenadas redondeadas a 7 decimales con `parseFloat(val.toFixed(7))`. `ngZone.run(() => form.patchValue({ latitud, longitud }))` para disparar detección de cambios.
- **Leaflet en dialog:** `ngAfterViewInit` + `setTimeout(400)`. Fix de iconos al nivel de módulo. `mapa.remove()` en `ngOnDestroy`.
- **Guardado:** valida que haya coordenadas antes de enviar; si faltan → `toast.warning`. Al cerrar dialog: `toast.success("Paradero X creado. Código: PAR-XXXX")` en el componente padre.
