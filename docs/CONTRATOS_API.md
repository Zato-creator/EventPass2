# Contratos API — Frontend ↔ n8n

> **Este documento es la ley.** Solo DEV-A lo modifica, y siempre en el mismo commit que `src/types/**`. Cualquier cambio se avisa por el chat del equipo.

## 1. Cómo se comunica el frontend con n8n

```
Navegador ──► Next.js /api/n8n/<ruta>  (proxy, Vercel)
                 │  agrega header X-EP-Key (secreto, solo servidor)
                 ▼
          n8n  /webhook/ep/<ruta>
```

- El proxy (`src/app/api/n8n/[...path]/route.ts`) **solo reenvía**: método, query, body y `Authorization`. No tiene lógica.
- El chat (WF10) no pasa por el proxy: `@n8n/chat` habla directo con el Chat Trigger (`NEXT_PUBLIC_N8N_CHAT_URL`).
- Todos los webhooks usan **Header Auth** con `X-EP-Key`. Sin la cabecera → 401 (lo hace n8n).
- Sesión: `Authorization: Bearer <session_token>` en todas las operaciones privadas.

### Formato estándar de respuesta

```jsonc
// éxito
{ "ok": true, "data": { ... } }
// error
{ "ok": false, "error": { "code": "EMAIL_DUPLICADO", "message": "Ya existe una cuenta con ese correo." } }
```

| HTTP | Uso |
|---|---|
| 200 | Consulta / actualización correcta |
| 201 | Creación correcta (usuario, sesión, inscripción, código) |
| 400 | Datos inválidos o acción desconocida |
| 401 | Sesión inválida / credenciales inválidas / falta X-EP-Key |
| 403 | Usuario INACTIVO o recurso que no le pertenece |
| 404 | Recurso no existe |
| 409 | Conflicto de negocio (duplicado, evento no disponible, Telegram no vinculado) |
| 500 | Error interno de n8n |

### Catálogo de códigos de error

| code | HTTP | Workflow |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | todos |
| `ACCION_DESCONOCIDA` | 400 | todos |
| `EMAIL_DUPLICADO` | 409 | WF01 |
| `USUARIO_NO_ENCONTRADO` | 404 | WF01 |
| `CREDENCIALES_INVALIDAS` | 401 | WF02 |
| `USUARIO_INACTIVO` | 403 | WF02, WF11 |
| `SESION_INVALIDA` | 401 | WF11 (no existe, cerrada, expirada) |
| `TELEGRAM_YA_VINCULADO` | 409 | WF03 |
| `EVENTO_NO_ENCONTRADO` | 404 | WF05, WF06 |
| `EVENTO_NO_DISPONIBLE` | 409 | WF06 (no PUBLICADO o fecha pasada) |
| `TELEGRAM_NO_VINCULADO` | 409 | WF06 |
| `INSCRIPCION_DUPLICADA` | 409 | WF06 |
| `INSCRIPCION_NO_ENCONTRADA` | 404 | WF06 |
| `INSCRIPCION_YA_CANCELADA` | 409 | WF06 |
| `ERROR_INTERNO` | 500 | todos |

---

## 2. WF01 — Usuarios · `POST /webhook/ep/usuarios`

Body con campo `accion`.

### `registrar` (público)
```json
{ "accion": "registrar", "nombre": "Laura Gómez", "email": "Laura@Correo.com", "password": "Clave1234" }
```
Validaciones: nombre 3–80 car., email válido (se normaliza a minúsculas y sin espacios), password ≥ 8 car. con letra y número.
**201**
```json
{ "ok": true, "data": { "usuario_id": "USR-20261005-8F3A1C", "nombre": "Laura Gómez", "email": "laura@correo.com", "estado": "ACTIVO" } }
```
Errores: `DATOS_INVALIDOS`, `EMAIL_DUPLICADO`.

### `perfil` (privado)
```json
{ "accion": "perfil" }
```
**200** `data`: `{ usuario_id, nombre, email, estado, fecha_registro, telegram_vinculado: boolean, telegram_username: string|null }`

### `actualizar` (privado)
```json
{ "accion": "actualizar", "nombre": "Laura M. Gómez", "password_actual": "Clave1234", "password_nueva": "Nueva5678" }
```
`nombre` opcional; si viene `password_nueva`, `password_actual` es obligatoria y se verifica. El email **no** se cambia.
**200** `data`: perfil actualizado.

### `desactivar` (privado)
```json
{ "accion": "desactivar", "password": "Clave1234" }
```
Pone `estado=INACTIVO` y cierra sus sesiones ACTIVAS. **200** `data: { "estado": "INACTIVO" }`.

---

## 3. WF02 — Autenticación · `POST /webhook/ep/auth`

### `login`
```json
{ "accion": "login", "email": "laura@correo.com", "password": "Clave1234" }
```
**201**
```json
{ "ok": true, "data": {
  "session_token": "a3f9…(64 hex)",
  "expira_en": "2026-10-06T08:20:00-05:00",
  "usuario": { "usuario_id": "USR-…", "nombre": "Laura Gómez", "email": "laura@correo.com" }
} }
```
Errores: `CREDENCIALES_INVALIDAS` (mismo mensaje si el email no existe o la clave falla), `USUARIO_INACTIVO`.
Duración de sesión: **12 horas**.

### `logout` (privado)
`{ "accion": "logout" }` → estado `CERRADA`, `cerrada_en`. **200** `data: { "cerrada": true }`.

### `validar` (privado)
`{ "accion": "validar" }` → **200** `data: { "valida": true, "usuario_id": "…", "expira_en": "…" }` o **401** `SESION_INVALIDA`.

---

## 4. WF11 — Validar sesión (sub-workflow interno, no es webhook)

Entrada: `{ "session_token": "…" }`
Salida:
```json
{ "valida": true, "usuario_id": "USR-…", "session_id": "SES-…", "motivo": null }
{ "valida": false, "usuario_id": null, "session_id": null, "motivo": "NO_EXISTE | CERRADA | EXPIRADA | USUARIO_INACTIVO" }
```
Efectos: actualiza `ultima_validacion`; si está vencida la marca `EXPIRADA`.
Lo usan WF01 (privadas), WF02 `validar`, WF03 (webhook) y WF06.

---

## 5. WF03 — Telegram · `POST /webhook/ep/telegram` + Telegram Trigger

### `generar_codigo` (privado)
`{ "accion": "generar_codigo" }`
Cancela códigos PENDIENTE anteriores del usuario (→ `CANCELADO`) y crea uno nuevo de 6 caracteres, vigencia **10 minutos**.
**201**
```json
{ "ok": true, "data": { "codigo": "K7P2QX", "expira_en": "2026-10-05T20:40:00-05:00", "bot_username": "EventPassColegiosBot", "instruccion": "/vincular K7P2QX" } }
```
Error: `TELEGRAM_YA_VINCULADO`.

### `estado` (privado)
`{ "accion": "estado" }` → **200** `data: { "vinculado": true, "telegram_username": "laura_g", "fecha_vinculacion": "…" }`

### Telegram Trigger — mensaje `/vincular CODIGO`
Respuestas del bot:
- OK → "✅ Tu cuenta EventPass quedó vinculada." (código → USADO, se crea Vinculación ACTIVA)
- Código inexistente / usado / cancelado → "❌ Código inválido o ya utilizado."
- Vencido → "⌛ El código expiró. Genera uno nuevo en la web." (código → EXPIRADO)
- Otro mensaje → instrucciones de uso.

---

## 6. WF05 — Catálogo público · `GET /webhook/ep/catalogo`

Query: `visitor_id` (siempre), `evento_id` (detalle), `categoria` (filtro).
- Sin `evento_id` ni `categoria` → tipo `LISTADO`.
- Con `categoria` → tipo `FILTRO`.
- Con `evento_id` → tipo `DETALLE`.

Se publican eventos con estado **PUBLICADO, CERRADO o CANCELADO** (los dos últimos se muestran con su estado y sin botón de inscripción). Nunca `BORRADOR`.

Objeto evento:
```ts
type EventoPublico = {
  evento_id: string;
  nombre: string;
  categoria: "Académico" | "Deportes" | "Cultura" | "Tecnología" | "Comunidad";
  descripcion: string;
  fecha: string;          // "2026-10-15"
  hora: string;           // "08:00"
  lugar: string;
  capacidad: number;
  inscritos_confirmados: number;
  cupos_disponibles: number;   // max(capacidad - confirmados, 0) — calculado en n8n
  en_lista_espera: number;
  imagen_url: string;
  organizador: string;
  estado: "PUBLICADO" | "CERRADO" | "CANCELADO";
  disponibilidad: "DISPONIBLE" | "LLENO" | "CERRADO" | "CANCELADO";
};
```
Listado/filtro **200**: `data: { "tipo": "LISTADO", "total": 6, "eventos": EventoPublico[] }` ordenado por fecha ASC.
Detalle **200**: `data: { "tipo": "DETALLE", "evento": EventoPublico }` · **404** `EVENTO_NO_ENCONTRADO`.
Categorías: `GET /webhook/ep/catalogo?visitor_id=…&categorias=1` → `data: { "categorias": string[] }` (opcional, no se registra).

---

## 7. WF06 — Inscripciones · `POST /webhook/ep/inscripciones` (todo privado)

### `crear`
```json
{ "accion": "crear", "evento_id": "EVT-…", "nombre_acreditacion": "Laura Gómez — Colegio San Pedro", "observaciones": "Acudiente de 7°B" }
```
Orden de validación: sesión → usuario ACTIVO → Telegram vinculado → evento existe → evento PUBLICADO y fecha futura → sin inscripción activa (CONFIRMADA o LISTA_ESPERA) para el mismo usuario+evento → cálculo de cupos.
**201**
```json
{ "ok": true, "data": { "inscripcion": Inscripcion, "mensaje": "Inscripción confirmada." } }
```
Si no hay cupo → `estado: "LISTA_ESPERA"`, `orden_espera: n`, mensaje "Quedaste en lista de espera (posición n)."
Siempre notifica vía WF09 (`INSCRIPCION_CONFIRMADA` o `LISTA_ESPERA`).

### `listar`
`{ "accion": "listar" }` → **200** `data: { "inscripciones": (Inscripcion & { evento: { nombre, fecha, hora, lugar, estado } })[] }` ordenado por fecha de evento.

### `actualizar`
```json
{ "accion": "actualizar", "inscripcion_id": "INS-…", "nombre_acreditacion": "…", "observaciones": "…" }
```
Solo esos dos campos, solo si la inscripción no está CANCELADA y pertenece al usuario. **200**.

### `cancelar`
`{ "accion": "cancelar", "inscripcion_id": "INS-…" }` → estado `CANCELADA`. **200**.
Notifica `INSCRIPCION_CANCELADA`. El cupo liberado lo reasigna **WF07** (no WF06).

```ts
type Inscripcion = {
  inscripcion_id: string;
  usuario_id: string;
  evento_id: string;
  estado: "CONFIRMADA" | "LISTA_ESPERA" | "CANCELADA";
  fecha_inscripcion: string;
  fecha_actualizacion: string;
  nombre_acreditacion: string;
  observaciones: string;
  origen: "WEB" | "REASIGNACION";
  orden_espera: number | null;
};
```

---

## 8. WF09 — Notificaciones (sub-workflow interno)

Entrada:
```json
{
  "usuario_id": "USR-…",
  "tipo": "INSCRIPCION_CONFIRMADA | LISTA_ESPERA | REASIGNACION | INSCRIPCION_CANCELADA | EVENTO_CANCELADO | RECORDATORIO",
  "titulo": "Inscripción confirmada: Feria de Ciencias",
  "mensaje": "Texto plano para Telegram y cuerpo del correo",
  "evento_id": "EVT-…",
  "inscripcion_id": "INS-…",
  "clave_idempotencia": "INSCRIPCION_CONFIRMADA|INS-…"
}
```
Salida: `{ "notificacion_id", "gmail_estado", "telegram_estado", "duplicada": boolean }`.
Si `clave_idempotencia` ya existe en EP09 con algún canal ENVIADO → no reenvía, `duplicada: true`.
Gmail y Telegram en ramas independientes con *On Error → Continue (using error output)*. Sin `chat_id` → `telegram_estado = NO_APLICA`.

Quién la llama: WF06 (crear/cancelar), WF07 (reasignación), WF08 (recordatorio), WF04 (cancelación de evento → avisa a inscritos, opcional si da el tiempo).

---

## 9. WF10 — Asistente · Chat Trigger (`@n8n/chat`)

- Modo: *Hosted chat* desactivado, *Embedded chat*, **Allowed origins** = dominio de Vercel + `http://localhost:3000`.
- `metadata` enviada por el frontend: `{ "visitor_id": "…", "usuario_id": "USR-…" | null }`.
- `sessionId` de @n8n/chat se usa como `conversation_id` (prefijo `CNV-` si se genera en n8n).
- Herramientas del agente: **solo lectura** (eventos + cupos). Ninguna herramienta de escritura sobre EP01–EP09.
