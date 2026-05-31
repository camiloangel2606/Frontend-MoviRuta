# Microservicio: Negocio

## Tecnología y versión

- **Framework:** NestJS 11.x
- **Lenguaje:** TypeScript
- **ORM:** TypeORM 0.3.28
- **Base de datos:** MySQL 8 (driver `mysql2` ^3.22.3)
- **HTTP client (inter-servicio):** `axios` ^1.16.1
- **Validación:** `class-validator` + `class-transformer`
- **Node.js:** compatible con LTS (18/20)

---

## Puerto en el que corre

```
PORT=3000   (configurable por variable de entorno)
```

CORS habilitado para `http://localhost:4200` (Angular frontend).

---

## Variables de entorno necesarias

Archivo `.env` en la raíz del proyecto:

```env
NODE_ENV=development
PORT=3000

# Base de datos MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=movi_user
DB_PASSWORD=movi_pass_123
DB_DATABASE=moviruta_entrega2

# URL del microservicio de seguridad (Spring Boot)
MS_SECURITY=http://localhost:8080
```

---

## Entidades / modelos principales

### Empresa
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK autoincrement |
| nombre | varchar(120) | requerido |
| nit | varchar(30) | nullable, único |
| buses | Bus[] | relación OneToMany |
| createdAt / updatedAt | datetime | automático |

### Bus
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| placa | varchar(10) | único, requerido |
| modelo | varchar(60) | requerido |
| anio | int | requerido |
| capacidadMaxima | int | requerido |
| estado | enum | OPERATIVO \| MANTENIMIENTO \| FUERA_SERVICIO |
| empresa | Empresa | FK requerida |

### Ruta
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| nombre | varchar(120) | único, requerido |
| descripcion | varchar(255) | nullable |
| tarifa | decimal(10,2) | requerido |

### Paradero
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| nombre | varchar(140) | requerido |
| latitud | decimal(10,7) | requerido |
| longitud | decimal(10,7) | requerido |
| tipo | enum | PARADERO \| ESTACION \| TERMINAL |

### RutaParadero (tabla pivot Ruta ↔ Paradero)
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| ruta | Ruta | FK, CASCADE |
| paradero | Paradero | FK, RESTRICT |
| orden | int | posición en la ruta |
| distanciaDesdeAnterior | decimal(10,2) | km, nullable |
| tiempoEstimadoDesdeAnterior | int | minutos, nullable |

### Persona
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| nombres | varchar(120) | requerido |
| apellidos | varchar(120) | requerido |
| email | varchar(150) | único, requerido |
| telefono | varchar(30) | nullable |
| securityUserId | varchar(50) | único, nullable — **vincula con ms-security** |

### Ciudadano
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| persona | Persona | OneToOne, CASCADE |
| fechaNacimiento | date | nullable |

### Conductor
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| persona | Persona | OneToOne, CASCADE |
| licencia | varchar(50) | nullable |

### Turno
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| conductor | Conductor | FK, RESTRICT |
| bus | Bus | FK, RESTRICT |
| inicio | datetime | requerido |
| fin | datetime | nullable |
| estado | enum | PROGRAMADO \| EN_CURSO \| FINALIZADO |
| observaciones | varchar(255) | nullable |

### Programacion
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| ruta | Ruta | FK, RESTRICT |
| bus | Bus | FK, RESTRICT |
| conductorAsignado | Conductor | FK, RESTRICT |
| fecha | date | requerido |
| horaSalida | time | formato HH:MM:SS |
| recurrente | enum | UNICA \| DIARIA \| LUNES_A_VIERNES \| FINES_DE_SEMANA |
| toleranciaMinutos | int | default 0 |
| estado | varchar(30) | default 'PROGRAMADO' |

### Boleto
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| ciudadano | Ciudadano | FK, RESTRICT |
| programacion | Programacion | FK, RESTRICT |
| rutaParaderoOrigen | RutaParadero | FK, RESTRICT |
| rutaParaderoDescenso | RutaParadero | FK, nullable, SET NULL |
| estado | enum | ACTIVO \| COMPLETADO \| CANCELADO |
| costo | decimal(10,2) | requerido |
| horaFin | datetime | se llena al descender |

### Historial
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| boleto | Boleto | FK, CASCADE |
| paradero | Paradero | FK, RESTRICT |
| tipo | enum | ABORDAJE \| DESCENSO |
| fecha | datetime | automático |
| orden | int | nullable |

### GPS
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| bus | Bus | OneToOne, CASCADE |
| deviceId | varchar(120) | único |
| latitud / longitud | decimal(10,7) | nullable, se actualiza en tiempo real |

### Grupo
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| nombre | varchar(120) | único |
| descripcion | varchar(255) | nullable |

### Mensaje
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| emisor | Persona | FK, RESTRICT |
| contenido | text | requerido |
| fechaEnvio | datetime | automático |

### Incidente
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| bus | Bus | FK, RESTRICT |
| reportadoPor | Persona | nullable |
| tipo | enum | MECANICO \| ACCIDENTE \| ELECTRICO \| OTRO |
| gravedad | enum | BAJA \| MEDIA \| ALTA \| CRITICA |
| descripcion | varchar(500) | requerido |
| estado | enum | PENDIENTE \| EN_PROCESO \| RESUELTO |
| latitud / longitud | decimal(10,7) | nullable |

### MetodoPago
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| nombre | varchar(120) | único |
| tipo | enum | TARJETA \| EFECTIVO \| TRANSFERENCIA |

### MetodoPagoCiudadano
| Campo | Tipo | Notas |
|---|---|---|
| id | number | PK |
| ciudadano | Ciudadano | FK, CASCADE |
| metodoPago | MetodoPago | FK, CASCADE |
| identificador | varchar(120) | número de tarjeta, cuenta, etc. |
| saldo | decimal(10,2) | |

---

## Endpoints disponibles

> **Base URL:** `http://localhost:3000`
>
> Los IDs en rutas son `number`. Los campos opcionales se omiten si no aplican.

---

### `/empresa`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/empresa` | Crea empresa | `{ nombre, nit? }` | Empresa creada |
| GET | `/empresa` | Lista todas | — | Empresa[] |
| GET | `/empresa/:id` | Detalle | — | Empresa |
| PATCH | `/empresa/:id` | Actualiza | campos parciales | Empresa |
| DELETE | `/empresa/:id` | Elimina | — | — |

---

### `/bus`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/bus` | Crea bus | `{ placa, modelo, anio, capacidadMaxima, empresaId, estado? }` | Bus |
| GET | `/bus` | Lista todos | — | Bus[] |
| GET | `/bus/:id` | Detalle | — | Bus |
| PATCH | `/bus/:id` | Actualiza | campos parciales | Bus |
| DELETE | `/bus/:id` | Elimina | — | — |

---

### `/ruta`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/ruta` | Crea ruta simple | `{ nombre, descripcion?, tarifa }` | Ruta |
| POST | `/ruta/con-paraderos` | Crea ruta con paraderos en una sola operación | `{ nombre, descripcion?, tarifa, paraderos: [{paraderoId, orden, distanciaDesdeAnterior?, tiempoEstimadoDesdeAnterior?}] }` | Ruta con paraderos |
| GET | `/ruta` | Lista rutas (filtra por `?nombre=`) | — | Ruta[] |
| GET | `/ruta/:id/paraderos` | Lista paraderos de una ruta en orden | — | RutaParadero[] |
| GET | `/ruta/:id` | Detalle | — | Ruta |
| PATCH | `/ruta/:id` | Actualiza | campos parciales | Ruta |
| DELETE | `/ruta/:id` | Elimina | — | — |

---

### `/paradero`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/paradero` | Crea paradero | `{ nombre, latitud, longitud, tipo? }` | Paradero |
| GET | `/paradero` | Lista todos | — | Paradero[] |
| GET | `/paradero/cercanos` | Paraderos cercanos a coordenadas `?lat=&lng=` | — | Paradero[] |
| GET | `/paradero/:id` | Detalle | — | Paradero |
| PATCH | `/paradero/:id` | Actualiza | campos parciales | Paradero |
| DELETE | `/paradero/:id` | Elimina | — | — |

---

### `/ruta-paradero`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/ruta-paradero` | Agrega paradero a ruta | `{ rutaId, paraderoId, orden, distanciaDesdeAnterior?, tiempoEstimadoDesdeAnterior? }` | RutaParadero |
| GET | `/ruta-paradero` | Lista todos | — | RutaParadero[] |
| GET | `/ruta-paradero/:id` | Detalle | — | RutaParadero |
| PATCH | `/ruta-paradero/:id` | Actualiza | campos parciales | RutaParadero |
| DELETE | `/ruta-paradero/:id` | Elimina | — | — |

---

### `/persona`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/persona` | Crea persona | `{ nombres, apellidos, email, telefono?, securityUserId }` | Persona |
| GET | `/persona` | Lista todas | — | Persona[] |
| GET | `/persona/:id` | Detalle por ID interno | — | Persona |
| GET | `/persona/security/:securityUserId` | Obtiene perfil sincronizado con ms-security | — | Persona |
| PATCH | `/persona/:id` | Actualiza por ID interno | campos parciales | Persona |
| PATCH | `/persona/security/:securityUserId` | Actualiza por ID de ms-security | campos parciales | Persona |
| DELETE | `/persona/:id` | Elimina | — | — |
| POST | `/persona/security/:securityUserId/verificar-conductor` | Verifica si la persona tiene rol conductor en ms-security y lo crea en BD negocio | — | Conductor |

---

### `/ciudadano`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/ciudadano` | Crea ciudadano | `{ personaId, fechaNacimiento? }` | Ciudadano |
| GET | `/ciudadano` | Lista todos | — | Ciudadano[] |
| GET | `/ciudadano/:id` | Detalle | — | Ciudadano |
| PATCH | `/ciudadano/:id` | Actualiza | campos parciales | Ciudadano |
| DELETE | `/ciudadano/:id` | Elimina | — | — |

---

### `/conductor`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/conductor` | Crea conductor | `{ personaId, licencia? }` | Conductor |
| GET | `/conductor` | Lista todos | — | Conductor[] |
| GET | `/conductor/:id` | Detalle | — | Conductor |
| PATCH | `/conductor/:id` | Actualiza | campos parciales | Conductor |
| DELETE | `/conductor/:id` | Elimina | — | — |

---

### `/turno`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/turno` | Crea turno | `{ conductorId, busId, inicio, fin?, estado?, observaciones? }` | Turno |
| GET | `/turno` | Lista todos | — | Turno[] |
| GET | `/turno/conductor/:conductorId` | Lista todos los turnos de un conductor | — | Turno[] |
| GET | `/turno/:id` | Detalle | — | Turno |
| PATCH | `/turno/:id` | Actualiza | campos parciales | Turno |
| DELETE | `/turno/:id` | Elimina | — | — |
| POST | `/turno/:id/iniciar` | Inicia turno (cambia estado a EN_CURSO) | `IniciarTurnoDto` | Turno |
| POST | `/turno/:id/finalizar` | Finaliza turno (cambia estado a FINALIZADO) | — | Turno |

---

### `/programacion`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/programacion` | Crea programación | `{ rutaId, busId, conductorId, fecha, horaSalida, recurrente?, toleranciaMinutos? }` | Programacion |
| GET | `/programacion` | Lista (soporta filtros por query) | — | Programacion[] |
| GET | `/programacion/:id` | Detalle | — | Programacion |
| PATCH | `/programacion/:id` | Actualiza | campos parciales | Programacion |
| DELETE | `/programacion/:id` | Elimina | — | — |

---

### `/boleto`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/boleto` | Compra boleto | `{ ciudadanoId, programacionId, rutaParaderoOrigenId, metodoPagoId }` | Boleto |
| GET | `/boleto` | Lista boletos (filtra con `?ciudadanoId=`) | — | Boleto[] |
| GET | `/boleto/:id` | Detalle | — | Boleto |
| PATCH | `/boleto/:id` | Actualiza boleto | campos parciales | Boleto |
| DELETE | `/boleto/:id` | Elimina | — | — |

---

### `/historial`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/historial` | Registra abordaje o descenso | `{ boletoId, paraderoId, tipo: 'ABORDAJE'\|'DESCENSO', orden? }` | Historial |
| GET | `/historial` | Lista (soporta filtros por query) | — | Historial[] |
| GET | `/historial/:id` | Detalle | — | Historial |
| DELETE | `/historial/:id` | Elimina | — | — |

---

### `/gps`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/gps` | Registra dispositivo GPS | `{ busId, deviceId }` | GPS |
| GET | `/gps` | Lista todos | — | GPS[] |
| GET | `/gps/:id` | Detalle | — | GPS |
| PATCH | `/gps/:id` | Actualiza datos generales | campos parciales | GPS |
| PATCH | `/gps/:id/posicion` | **Actualiza posición en tiempo real** | `{ latitud, longitud }` | GPS |
| DELETE | `/gps/:id` | Elimina | — | — |

---

### `/grupo`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/grupo` | Crea grupo | `{ nombre, descripcion? }` | Grupo |
| GET | `/grupo` | Lista todos | — | Grupo[] |
| GET | `/grupo/:id` | Detalle | — | Grupo |
| PATCH | `/grupo/:id` | Actualiza | campos parciales | Grupo |
| DELETE | `/grupo/:id` | Elimina | — | — |
| POST | `/grupo/:id/miembros` | Agrega miembro | `{ personaId, rol? }` | GrupoPersona |
| GET | `/grupo/:id/miembros` | Lista miembros del grupo | — | GrupoPersona[] |
| DELETE | `/grupo/:id/miembros/:personaId` | Elimina miembro | — | — |

---

### `/mensaje`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/mensaje` | Envía mensaje | `{ emisorId, contenido, destinatariosPersonaIds?: number[], destinatariosGrupoIds?: number[] }` | Mensaje |
| GET | `/mensaje` | Lista todos | — | Mensaje[] |
| GET | `/mensaje/:id` | Detalle | — | Mensaje |

---

### `/destinatario-persona`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| PATCH | `/destinatario-persona/:id/leido` | Marca mensaje como leído | `{ leido: boolean }` | DestinatarioPersona |

---

### `/nodo`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/nodo` | Crea nodo de grafo | `{ nombre, latitud, longitud, tipo? }` | Nodo |
| GET | `/nodo` | Lista todos | — | Nodo[] |
| GET | `/nodo/:id` | Detalle | — | Nodo |
| PATCH | `/nodo/:id` | Actualiza | campos parciales | Nodo |
| DELETE | `/nodo/:id` | Elimina | — | — |

---

### `/direccion`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/direccion` | Crea dirección de ciudadano | `{ ciudadanoId, linea1, linea2?, ciudad, departamento, codigoPostal? }` | Direccion |
| GET | `/direccion` | Lista todas | — | Direccion[] |
| GET | `/direccion/:id` | Detalle | — | Direccion |
| PATCH | `/direccion/:id` | Actualiza | campos parciales | Direccion |
| DELETE | `/direccion/:id` | Elimina | — | — |

---

### `/metodo-pago`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/metodo-pago` | Crea método de pago | `{ nombre, tipo }` | MetodoPago |
| GET | `/metodo-pago` | Lista todos | — | MetodoPago[] |
| GET | `/metodo-pago/:id` | Detalle | — | MetodoPago |
| PATCH | `/metodo-pago/:id` | Actualiza | campos parciales | MetodoPago |
| DELETE | `/metodo-pago/:id` | Elimina | — | — |

---

### `/metodo-pago-ciudadano`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/metodo-pago-ciudadano` | Vincula método de pago a ciudadano | `{ ciudadanoId, metodoPagoId, identificador, saldo? }` | MetodoPagoCiudadano |
| GET | `/metodo-pago-ciudadano` | Lista todos | — | MetodoPagoCiudadano[] |
| GET | `/metodo-pago-ciudadano/:id` | Detalle | — | MetodoPagoCiudadano |
| PATCH | `/metodo-pago-ciudadano/:id` | Actualiza | campos parciales | MetodoPagoCiudadano |
| DELETE | `/metodo-pago-ciudadano/:id` | Elimina | — | — |

---

### `/incidente`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/incidente` | Reporta incidente | `{ busId, reportadoPorId?, tipo, gravedad, descripcion, estado?, latitud?, longitud?, fotos?: string[] }` | Incidente |
| GET | `/incidente` | Lista (soporta filtros por query) | — | `{ data: Incidente[], total, page, limit }` |
| GET | `/incidente/:id` | Detalle | — | Incidente |
| PATCH | `/incidente/:id` | Actualiza estado/datos | campos parciales | Incidente |
| DELETE | `/incidente/:id` | Elimina | — | — |

---

### `/foto`

| Método | Ruta | Qué hace | Body esperado | Respuesta |
|---|---|---|---|---|
| POST | `/foto` | Agrega foto a incidente | `{ incidenteId, url }` | Foto |
| GET | `/foto` | Lista todas | — | Foto[] |
| GET | `/foto/:id` | Detalle | — | Foto |
| PATCH | `/foto/:id` | Actualiza | campos parciales | Foto |
| DELETE | `/foto/:id` | Elimina | — | — |

---

## Cómo se autentica (espera token del ms-security?)

Sí. El microservicio de negocio delega **toda la autenticación y autorización** al microservicio `ms-security` (Spring Boot, puerto 8080).

### Flujo

1. El frontend obtiene un JWT de `ms-security` al hacer login.
2. El frontend envía ese JWT en el header `Authorization` en cada petición al backend de negocio.
3. El backend de negocio tiene un `SecurityGuard` que intercepta la petición, extrae el token del header y llama a ms-security para validar si el usuario tiene permiso sobre esa ruta/método.

### SecurityGuard (implementado pero no activo en todos los endpoints)

```
Header requerido:  Authorization: <JWT_TOKEN>
```

> **Estado actual:** El guard está implementado en `src/core/guards/security.guard.ts` pero en la mayoría de los controllers está **comentado**. Actualmente solo hay referencia activa en `ciudadano.controller.ts` (comentada también en PATCH). El guard **no está aplicado globalmente** — se aplica endpoint por endpoint con `@UseGuards(SecurityGuard)`.

---

## Cómo se comunica con ms-security

### Endpoint que consume

```
POST  http://localhost:8080/api/permissions/validate
```

### Request que envía

```http
POST /api/permissions/validate HTTP/1.1
Host: localhost:8080
Authorization: <JWT_TOKEN_DEL_USUARIO>
Content-Type: application/json

{
  "url": "/ciudadano/5",
  "method": "PATCH"
}
```

### Response esperada

```json
true   // o false si no tiene permiso
```

- Si `false` o error → lanza `UnauthorizedException` (HTTP 401).
- Si el header `Authorization` no llega → lanza `UnauthorizedException` (HTTP 401).

### Sincronización de usuarios (Persona ↔ ms-security)

La entidad `Persona` tiene el campo `securityUserId` (varchar 50) que almacena el UUID del usuario en ms-security. Esto permite:

| Endpoint | Qué hace |
|---|---|
| `GET /persona/security/:securityUserId` | Busca la persona local por su ID de ms-security |
| `PATCH /persona/security/:securityUserId` | Actualiza persona usando su ID de ms-security |
| `POST /persona/security/:securityUserId/verificar-conductor` | Verifica rol conductor en ms-security y lo crea en BD negocio si corresponde |

La URL base de ms-security se configura con la variable `MS_SECURITY=http://localhost:8080`.

---

## Notas importantes para el desarrollador frontend

1. **No hay autenticación global activa.** El `SecurityGuard` existe pero está comentado en casi todos los endpoints. En producción se activará — preparar el frontend para enviar `Authorization: <token>` en todas las peticiones desde ya.

2. **Flujo de registro de usuario nuevo:**
   - Crear primero en ms-security → obtener `securityUserId`.
   - Luego `POST /persona` con ese `securityUserId`.
   - Luego `POST /ciudadano` o `POST /conductor` según el rol.

3. **Boleto requiere programación activa.** Para crear un boleto se necesita el `programacionId`, el `rutaParaderoOrigenId` (paradero donde aborda), el `ciudadanoId` y el `metodoPagoId`. El campo `costo` se calcula en el servicio a partir de la tarifa de la ruta.

4. **GPS en tiempo real.** Usar `PATCH /gps/:id/posicion` con `{ latitud, longitud }` para actualizaciones de posición del bus. No usar el PATCH general del GPS para posición.

5. **Paraderos cercanos.** `GET /paradero/cercanos?lat=4.6&lng=-74.08` devuelve paraderos ordenados por proximidad — útil para el mapa del frontend.

6. **Ruta con paraderos en una sola llamada.** Preferir `POST /ruta/con-paraderos` en lugar de crear ruta y después agregar paraderos uno a uno.

7. **Filtros disponibles por query string:**
   - `/ruta?nombre=Ruta Norte` — busca rutas por nombre
   - `/boleto?ciudadanoId=3` — filtra boletos de un ciudadano
   - `/programacion` — acepta filtros (ver DTO `FindProgramacionQueryDto`)
   - `/historial` — acepta filtros (ver DTO `FindHistorialQueryDto`)
   - `/incidente` — acepta filtros (ver DTO `QueryIncidenteDto`)

8. **Restricciones de eliminación (RESTRICT en FK).** No se puede eliminar una Empresa que tenga buses, un Bus con turnos activos, una Ruta con programaciones, etc. El backend responderá con `400 Bad Request` o `409 Conflict`. Manejar estos errores en la UI.

9. **Mensajería.** Un mensaje puede tener destinatarios individuales (`destinatariosPersonaIds`) y/o grupales (`destinatariosGrupoIds`) en el mismo request. Para marcar como leído usar `PATCH /destinatario-persona/:id/leido`.

10. **Fotos de incidentes.** Se almacenan como URLs (`url: string`). Hay dos formas de adjuntarlas:
    - En la creación: incluir `fotos: string[]` en el body del `POST /incidente` (máx 5 URLs, cada una máx **400 caracteres**). No usar base64 — excede el límite.
    - Post-creación: llamar `POST /foto` con `{ incidenteId, url }` por cada foto usando el `id` del incidente ya creado.

11. **Coordenadas GPS en incidentes.** `latitud` y `longitud` aceptan hasta **7 decimales** (`@IsNumber({ maxDecimalPlaces: 7 })`). `navigator.geolocation` devuelve 10–15 decimales → siempre redondear antes de enviar: `parseFloat(coords.lat.toFixed(7))`.

12. **Respuesta paginada de `GET /incidente`.** Devuelve `{ data: Incidente[], total: number, page: number, limit: number }` — **no** un array plano. Al consumir, extraer `.data`. Lo mismo aplica a otros endpoints que usen paginación.

11. **Turno vs Programacion.** Son entidades distintas: `Programacion` es el horario planificado (ruta + bus + conductor + fecha/hora); `Turno` es el registro de trabajo real del conductor (inicio/fin efectivos). Un turno se inicia con `POST /turno/:id/iniciar` y se cierra con `POST /turno/:id/finalizar`.

13. **Turnos por conductor.** Usar `GET /turno/conductor/:conductorId` para obtener todos los turnos de un conductor específico. Retorna `404` si el conductor no existe y `[]` si no tiene turnos asignados. La ruta `/conductor/:conductorId` está declarada antes de `/:id` en el controlador para evitar conflicto de rutas en NestJS.

12. **ValidationPipe estricto.** El backend rechazará (HTTP 400) cualquier campo extra no definido en los DTOs. Enviar exactamente los campos documentados.
