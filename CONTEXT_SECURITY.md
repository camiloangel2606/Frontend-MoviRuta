# Microservicio: Security

## Tecnología y versión

- **Lenguaje:** Java 17
- **Framework:** Spring Boot 4.0.3
- **Base de datos:** MongoDB Atlas (base `ms-security`, colección `crud-usuarios`)
- **Autenticación:** JWT (JJWT 0.11.5, algoritmo HS512)
- **Seguridad:** Spring Security + BCrypt
- **HTTP reactivo:** Spring WebFlux (para llamadas a APIs externas)
- **Email:** Spring Mail (Gmail SMTP)
- **Protección bots:** reCAPTCHA v3 de Google
- **Lombok:** Generación de boilerplate

---

## Puerto en el que corre

```
5050
```

URL base local: `http://localhost:5050`

---

## Variables de entorno necesarias

| Variable | Descripción | Ejemplo / Valor esperado |
|---|---|---|
| `MONGO_URI` | URI de conexión a MongoDB Atlas | `mongodb+srv://user:pass@host/db` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | Cadena larga aleatoria |
| `JWT_EXPIRATION` | Expiración del token en milisegundos | `3600000` (1 hora) |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth 2.0 | De Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth 2.0 | De Google Cloud Console |
| `GITHUB_CLIENT_ID` | Client ID de GitHub OAuth | De GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | Client Secret de GitHub OAuth | De GitHub Developer Settings |
| `MICROSOFT_CLIENT_ID` | Client ID de Azure AD | De Azure Portal |
| `MICROSOFT_CLIENT_SECRET` | Client Secret de Azure AD | De Azure Portal |
| `MICROSOFT_TENANT_ID` | Tenant ID de Azure AD | De Azure Portal |
| `RECAPTCHA_SECRET_KEY` | Clave secreta de Google reCAPTCHA v3 | De Google reCAPTCHA Admin |
| `RECAPTCHA_THRESHOLD` | Umbral mínimo de score aceptado | `0.5` |
| `MAIL_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USERNAME` | Cuenta de correo remitente | `app@gmail.com` |
| `MAIL_PASSWORD` | App password de Gmail | No es la contraseña normal |
| `FRONTEND_URL` | URL del frontend (para redirecciones OAuth) | `http://localhost:4200` |
| `TWO_FACTOR_EXPIRY_MINUTES` | Minutos de validez del código 2FA | `5` |
| `RESET_TOKEN_EXPIRY_MINUTES` | Minutos de validez del token de reset | `30` |
| `TWO_FACTOR_MAX_ATTEMPTS` | Intentos máximos antes de bloqueo 2FA | `3` |

---

## Entidades / modelos principales

### User
```json
{
  "id": "ObjectId (MongoDB)",
  "name": "String (requerido)",
  "email": "String (requerido, único)",
  "password": "String (null para usuarios OAuth)",
  "authProvider": "String: LOCAL | GOOGLE | GITHUB | MICROSOFT",
  "twoFactorCode": "String (temporal, código 2FA activo)",
  "twoFactorExpiry": "LocalDateTime (expira en 5 min)",
  "twoFactorAttempts": "Integer (intentos fallidos de 2FA)",
  "resetToken": "String UUID (para reseteo de contraseña)",
  "resetTokenExpiry": "LocalDateTime (expira en 30 min)"
}
```

### Role
```json
{
  "id": "ObjectId",
  "name": "String (ej: ADMINISTRADOR, CIUDADANO)",
  "description": "String"
}
```

> **Rol por defecto:** `CIUDADANO` — se asigna automáticamente al registrar un usuario nuevo.

### Permission
```json
{
  "id": "ObjectId",
  "url": "String (ej: /api/users/?, /api/roles)",
  "method": "String: GET | POST | PUT | DELETE",
  "model": "String (ej: User, Role, Session)"
}
```

> Los IDs en las URLs se normalizan como `?` para la validación de permisos.

### RolePermission (tabla de unión)
```json
{
  "id": "ObjectId",
  "role": "DBRef → Role",
  "permission": "DBRef → Permission"
}
```

### UserRole (tabla de unión)
```json
{
  "id": "ObjectId",
  "user": "DBRef → User",
  "role": "DBRef → Role"
}
```

### Session
```json
{
  "id": "ObjectId",
  "token": "String (JWT completo)",
  "expiration": "Date (fecha de expiración del token)",
  "code2FA": "String (opcional)",
  "user": "DBRef → User"
}
```

### Profile
```json
{
  "id": "ObjectId",
  "phone": "String (número de teléfono)",
  "photo": "String (URL de la foto de perfil)",
  "user": "DBRef → User"
}
```

---

## Endpoints disponibles

### Rutas públicas — NO requieren JWT

**Base:** `/api/public/`

---

#### Autenticación local

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/public/security/test` | Health check del servicio |
| `POST` | `/api/public/security/register` | Registro de usuario con email y contraseña |
| `POST` | `/api/public/security/login` | Login (inicia flujo 2FA) |
| `POST` | `/api/public/security/verify-2fa` | Verifica el código 2FA y devuelve el JWT |
| `POST` | `/api/public/security/resend-2fa` | Reenvía el código 2FA al email |
| `POST` | `/api/public/security/forgot-password` | Solicita un enlace de reseteo de contraseña |
| `POST` | `/api/public/security/reset-password` | Establece nueva contraseña usando el token recibido por email |

**`POST /api/public/security/register`**
```json
// Body
{ "name": "Juan Pérez", "email": "juan@ejemplo.com", "password": "MiPass123!" }

// Respuesta 201
{ "id": "...", "name": "Juan Pérez", "email": "juan@ejemplo.com", "authProvider": "LOCAL" }
```

**`POST /api/public/security/login`**
```json
// Body
{ "email": "juan@ejemplo.com", "password": "MiPass123!", "recaptchaToken": "token_de_recaptcha" }

// Respuesta 200 — NO devuelve JWT aún, inicia 2FA
{ "requires2FA": true, "email": "juan@ejemplo.com", "message": "Código enviado al correo" }
```

**`POST /api/public/security/verify-2fa`**
```json
// Body
{ "email": "juan@ejemplo.com", "code": "123456" }

// Respuesta 200 — aquí sí se recibe el JWT
{ "token": "eyJhbGciOiJIUzUxMiJ9..." }
```

**`POST /api/public/security/resend-2fa`**
```json
// Body
{ "email": "juan@ejemplo.com", "recaptchaToken": "token_de_recaptcha" }

// Respuesta 200
{ "requires2FA": true, "email": "juan@ejemplo.com", "message": "Nuevo código enviado" }
```

**`POST /api/public/security/forgot-password`**
```json
// Body
{ "email": "juan@ejemplo.com", "recaptchaToken": "token_de_recaptcha" }

// Respuesta 200 (mismo mensaje si el email no existe, por seguridad)
{ "message": "Si el email existe, recibirá instrucciones" }
```

**`POST /api/public/security/reset-password`**
```json
// Body
{ "token": "uuid-del-email", "newPassword": "NuevaPass123!" }

// Respuesta 200
{ "message": "Contraseña actualizada exitosamente" }
```

---

#### OAuth 2.0 — Google, GitHub, Microsoft

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/public/oauth2/login/google` | Devuelve la URL de autorización de Google |
| `GET` | `/api/public/oauth2/callback/google?code={code}` | Callback de Google — redirige al frontend con JWT |
| `GET` | `/api/public/oauth2/login/github` | Devuelve la URL de autorización de GitHub |
| `GET` | `/api/public/oauth2/callback/github?code={code}` | Callback de GitHub — redirige al frontend con JWT |
| `GET` | `/api/public/oauth2/login/microsoft` | Devuelve la URL de autorización de Microsoft |
| `GET` | `/api/public/oauth2/callback/microsoft?code={code}` | Callback de Microsoft — redirige al frontend con JWT |

**Flujo OAuth para el frontend:**
1. Llamar a `GET /api/public/oauth2/login/{provider}` → obtener `{ url: "https://..." }`
2. Redirigir al usuario a esa URL
3. El proveedor redirige de vuelta al backend (`/callback/{provider}`)
4. El backend redirige al frontend: `{FRONTEND_URL}/auth/callback?token={jwt}`
5. El frontend extrae el `token` de la query string y lo almacena

**En caso de error OAuth:**
```
{FRONTEND_URL}/auth/callback?error={codigo}&error_description={descripcion}
```

---

### Rutas protegidas — Requieren JWT

**Header obligatorio en todas:**
```
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
```

**El acceso a cada endpoint depende de que el rol del usuario tenga el permiso correspondiente (RBAC).**

---

#### Usuarios — `/api/users`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/users` | Lista todos los usuarios |
| `GET` | `/api/users/{id}` | Obtiene un usuario por ID |
| `POST` | `/api/users` | Crea un nuevo usuario |
| `PUT` | `/api/users/{id}` | Actualiza un usuario |
| `DELETE` | `/api/users/{id}` | Elimina un usuario |
| `POST` | `/api/users/{userId}/profile/{profileId}` | Asocia un perfil a un usuario |
| `DELETE` | `/api/users/{userId}/profile/{profileId}` | Desasocia el perfil de un usuario |
| `POST` | `/api/users/{userId}/session/{sessionId}` | Asocia una sesión a un usuario |
| `DELETE` | `/api/users/{userId}/session/{sessionId}` | Desasocia una sesión de un usuario |

---

#### Roles — `/api/roles`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/roles` | Lista todos los roles |
| `GET` | `/api/roles/{id}` | Obtiene un rol por ID |
| `POST` | `/api/roles` | Crea un nuevo rol |
| `PUT` | `/api/roles/{id}` | Actualiza un rol |
| `DELETE` | `/api/roles/{id}` | Elimina un rol |

**Body para crear/actualizar rol:**
```json
{ "name": "CONDUCTOR", "description": "Rol para conductores" }
```

---

#### Permisos — `/api/permissions`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/permissions` | Lista todos los permisos |
| `GET` | `/api/permissions/{id}` | Obtiene un permiso por ID |
| `POST` | `/api/permissions` | Crea un nuevo permiso |
| `PUT` | `/api/permissions/{id}` | Actualiza un permiso |
| `DELETE` | `/api/permissions/{id}` | Elimina un permiso |

**Body para crear/actualizar permiso:**
```json
{ "url": "/api/users/?", "method": "GET", "model": "User" }
```

---

#### Asignaciones Rol-Permiso — `/api/role-permissions`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/role-permissions` | Lista todas las asignaciones rol-permiso |
| `GET` | `/api/role-permissions/{id}` | Obtiene una asignación por ID |
| `POST` | `/api/role-permissions` | Asigna un permiso a un rol |
| `PUT` | `/api/role-permissions/{id}` | Actualiza una asignación |
| `DELETE` | `/api/role-permissions/{id}` | Elimina una asignación |

**Body para crear:**
```json
{ "role": { "id": "roleId" }, "permission": { "id": "permissionId" } }
```

---

#### Asignaciones Usuario-Rol — `/api/user-role`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/user-role` | Lista todas las asignaciones usuario-rol |
| `POST` | `/api/user-role/user/{userId}/role/{roleId}` | Asigna un rol a un usuario |
| `DELETE` | `/api/user-role/{userRoleId}` | Elimina la asignación de rol |
| `GET` | `/api/user-role/my-roles` | Devuelve los roles del usuario autenticado |

**`GET /api/user-role/my-roles` — Respuesta:**
```json
{ "roles": ["CIUDADANO", "ADMINISTRADOR"] }
```

---

#### Sesiones — `/api/sessions`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/sessions` | Lista todas las sesiones (admin) |
| `GET` | `/api/sessions/{id}` | Obtiene una sesión por ID |
| `POST` | `/api/sessions` | Crea una sesión manualmente (admin) |
| `PUT` | `/api/sessions/{id}` | Actualiza una sesión |
| `DELETE` | `/api/sessions/{id}` | Elimina una sesión |
| `GET` | `/api/sessions/my-sessions` | Devuelve las sesiones activas del usuario autenticado |
| `DELETE` | `/api/sessions/logout` | Cierra la sesión actual (invalida el token) |
| `DELETE` | `/api/sessions/logout-all` | Cierra todas las sesiones del usuario |
| `DELETE` | `/api/sessions/close/{sessionId}` | Cierra una sesión específica del usuario |

> `logout` invalida el JWT en la base de datos — el token deja de funcionar aunque no haya expirado.

---

#### Perfiles — `/api/profiles`

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/profiles` | Lista todos los perfiles (admin) |
| `GET` | `/api/profiles/{id}` | Obtiene un perfil por ID |
| `POST` | `/api/profiles` | Crea un perfil manualmente |
| `PUT` | `/api/profiles/{id}` | Actualiza un perfil |
| `DELETE` | `/api/profiles/{id}` | Elimina un perfil |
| `GET` | `/api/profiles/me` | Devuelve el perfil del usuario autenticado (404 si no existe) |
| `GET` | `/api/profiles/create-if-missing` | Devuelve el perfil o lo crea vacío si no existe |
| `POST` | `/api/profiles/change-password` | Cambia la contraseña del usuario autenticado |

**`POST /api/profiles/change-password` — Body:**
```json
{
  "currentPassword": "MiPassActual123!",
  "newPassword": "MiNuevaPass456!",
  "confirmPassword": "MiNuevaPass456!"
}
```
> Solo funciona para usuarios con `authProvider: LOCAL`. Los usuarios OAuth no tienen contraseña.

---

## Cómo se autentica

### Flujo completo de login local (con 2FA)

```
1. POST /api/public/security/login  →  { recaptchaToken, email, password }
2. Backend valida reCAPTCHA (score ≥ 0.5)
3. Backend valida credenciales y envía código 2FA al email
4. Respuesta: { requires2FA: true, email }

5. POST /api/public/security/verify-2fa  →  { email, code }
6. Backend verifica código (válido por 5 min, máx 3 intentos)
7. Respuesta: { token: "eyJ..." }  ← guardar este JWT
```

### Uso del JWT en peticiones protegidas

```http
GET /api/sessions/my-sessions
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
```

### Estructura del payload JWT

```json
{
  "sub": "userId",
  "id": "userId",
  "name": "Nombre del usuario",
  "email": "usuario@email.com",
  "roles": ["CIUDADANO"],
  "iat": 1716000000,
  "exp": 1716003600
}
```

### Interceptor de seguridad

- Aplica a **todas las rutas** `/api/**` excepto `/api/public/**`
- Valida el token contra la base de datos (si la sesión fue eliminada, el token es inválido aunque no haya expirado)
- Verifica que el rol del usuario tenga permiso para el método + URL solicitados
- Errores: `401 Unauthorized` (token inválido/ausente) o `403 Forbidden` (sin permiso)

### Política de contraseñas

Mínimo 8 caracteres, debe incluir: mayúscula, minúscula, número y carácter especial.

---

## Cómo se comunica con otros servicios

Este microservicio **no consume otros microservicios internos** del sistema MoviRuta. Solo realiza llamadas HTTP a APIs externas:

| Servicio externo | Para qué |
|---|---|
| **Google OAuth API** | Intercambio de código por token; obtención de datos del usuario |
| **GitHub OAuth API** | Intercambio de código por token; obtención de perfil y email |
| **Microsoft Graph / Azure AD** | Intercambio de código por token; obtención de datos del usuario |
| **Google reCAPTCHA v3** | Verificación de tokens anti-bot en endpoints sensibles |
| **Gmail SMTP** | Envío de códigos 2FA, links de reset de contraseña, notificaciones |

---

## Notas importantes para el desarrollador frontend

### 1. CORS
Solo el origen `http://localhost:4200` está permitido. En producción se deberá actualizar esta configuración.

### 2. Flujo OAuth — no es una redirección directa del frontend
El frontend NO llama al callback de OAuth directamente. El flujo correcto es:
- Pedir la URL al backend → redirigir al usuario → esperar el redirect de vuelta a `/auth/callback?token=...`
- Leer el `token` de la query string de esa URL

### 3. El JWT NO llega en el login, solo tras verificar 2FA
El endpoint `/login` nunca devuelve un JWT. El JWT solo se obtiene al completar el código 2FA en `/verify-2fa`.

### 4. Invalidación de tokens en el backend
El logout no es solo "borrar el token del localStorage". El backend valida cada token contra la base de datos. Llamar `DELETE /api/sessions/logout` es obligatorio para cerrar sesión correctamente; de lo contrario el token podría seguir siendo válido hasta expirar.

### 5. Usuarios OAuth no tienen contraseña
Si `authProvider !== "LOCAL"`, el endpoint `/api/profiles/change-password` devolverá error. Ocultar esa opción en la UI para usuarios de Google/GitHub/Microsoft.

### 6. reCAPTCHA requerido en varios endpoints públicos
Los siguientes endpoints requieren un `recaptchaToken` válido (reCAPTCHA v3 invisible):
- `/security/login`
- `/security/resend-2fa`
- `/security/forgot-password`

Integrar el SDK de reCAPTCHA v3 en el frontend y pasar el token en el body.

### 7. Manejo de errores estándar
```json
// Formato de error
{ "error": "Descripción del error" }

// Códigos HTTP
// 400 → datos inválidos o validación fallida
// 401 → token ausente o inválido
// 403 → sin permiso para esa acción
// 404 → recurso no encontrado
// 500 → error inesperado del servidor
```

### 8. Perfil del usuario — usar `/create-if-missing`
Para mostrar el perfil en la UI, usar `GET /api/profiles/create-if-missing` en lugar de `/me`. Esto garantiza que siempre se recibe un objeto de perfil, incluso si el usuario aún no completó su información.

### 9. Sesiones activas (dispositivos conectados)
`GET /api/sessions/my-sessions` devuelve todas las sesiones activas del usuario. Útil para una pantalla de "Dispositivos conectados" con opción de cerrar sesiones individuales (`DELETE /api/sessions/close/{sessionId}`).

### 10. Expiración del token
El JWT expira en **1 hora** (3 600 000 ms). Implementar renovación o redirigir al login cuando el servidor devuelva `401`.
