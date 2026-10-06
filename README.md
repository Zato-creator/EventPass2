# EventPass Colegios

> Plataforma pública para gestionar los eventos de un colegio: catálogo con cupos en tiempo real, inscripciones con lista de espera y reasignación automática, avisos por Gmail y Telegram, recordatorios y un asistente IA de soporte. Toda la lógica de negocio corre en **n8n**; el frontend en Vercel es solo cliente.

| | |
|---|---|
| **Proyecto** | EventPass Colegios (proyecto integrador individual) |
| **Estudiante** | Jose Miguel Sandoval |
| **URL pública (Vercel)** | https://eventpass-colegios.vercel.app |
| **Repositorio** | https://github.com/Zato-creator/EventPass2 |
| **Bot de Telegram** | [@EventPassColegiosBot](https://t.me/EventPassColegiosBot) |
| **Instancia n8n** | n8n Cloud · zona horaria `America/Bogota` |

---

## Contenido
1. [Descripción](#1-descripción)
2. [Arquitectura general](#2-arquitectura-general)
3. [Tecnologías](#3-tecnologías)
4. [Workflows, triggers y Google Sheets](#4-workflows-triggers-y-google-sheets)
5. [Comunicación frontend → n8n](#5-comunicación-frontend--n8n)
6. [Endpoints implementados](#6-endpoints-implementados)
7. [Estados utilizados](#7-estados-utilizados)
8. [Hashing de contraseñas](#8-hashing-de-contraseñas)
9. [Manejo de sesiones](#9-manejo-de-sesiones)
10. [Idempotencia](#10-idempotencia)
11. [Lista de espera y reasignación](#11-lista-de-espera-y-reasignación)
12. [Servicio central de notificaciones](#12-servicio-central-de-notificaciones)
13. [Asistente IA y sus restricciones](#13-asistente-ia-wf10-y-sus-restricciones)
14. [Frontend](#14-frontend)
15. [Datos de prueba](#15-datos-de-prueba)
16. [Variables de entorno](#16-variables-de-entorno-envexample)
17. [Cómo ejecutar el proyecto](#17-cómo-ejecutar-el-proyecto)
18. [Estructura del repositorio](#18-estructura-del-repositorio)
19. [Seguridad](#19-seguridad)
20. [Limitaciones conocidas](#20-limitaciones-conocidas)

---

## 1. Descripción

EventPass Colegios permite a estudiantes, docentes y acudientes:

- consultar públicamente el catálogo de eventos escolares (ferias de ciencia, torneos intercolegiales, escuelas de padres, muestras culturales, olimpiadas, orientación vocacional), filtrar por categoría y ver cupos disponibles;
- registrarse, iniciar y cerrar sesión, consultar y actualizar el perfil y desactivar la cuenta (borrado lógico);
- vincular su cuenta de Telegram con un código temporal (`/vincular CODIGO`);
- inscribirse a eventos: si hay cupo la inscripción queda **CONFIRMADA**, si no, en **LISTA_ESPERA**;
- editar los datos de acreditación y cancelar inscripciones;
- recibir confirmaciones, avisos de lista de espera, reasignaciones, cancelaciones y recordatorios (24 h y 1 h antes) por **Gmail y Telegram**;
- resolver dudas con **EventPass Assistant**, un chat IA informativo.

La **administración de eventos** (crear, consultar, actualizar, publicar, cerrar y cancelar) la hace solo el administrador mediante un **formulario de n8n** protegido con Basic Auth. No hay panel de administración en el frontend.

**Categorías:** Académico · Deportes · Cultura · Tecnología · Comunidad.

---

## 2. Arquitectura general

```
                 Navegador (estudiante / acudiente / docente)
                                   │
                                   ▼
          Next.js en Vercel (solo cliente: UI, loading / éxito / error)
             │                                              │
             │ fetch /api/n8n/<ruta>                        │ widget @n8n/chat
             ▼                                              │
  Proxy /api/n8n/[...path]  (agrega X-EP-Key, no tiene      │
  lógica de negocio)                                        │
             │ HTTPS                                        │ HTTPS
             ▼                                              ▼
  ┌──────────────────────────── n8n Cloud ─────────────────────────────┐
  │ Webhooks: WF01 usuarios · WF02 auth · WF03 telegram ·              │
  │           WF05 catálogo · WF06 inscripciones                       │
  │ Form Trigger: WF04 eventos (administrador)                         │
  │ Schedule: WF07 reasignación (5 min) · WF08 recordatorios (15 min)  │
  │ Telegram Trigger: WF03 (/vincular)    Chat Trigger: WF10 asistente │
  │                                                                    │
  │ Sub-workflows: WF11 validar sesión · WF09 notificaciones           │
  │        (validaciones, reglas de negocio, estados, idempotencia)    │
  └────────────────────────────────────────────────────────────────────┘
             │                         │                      │
             ▼                         ▼                      ▼
   Google Sheets EP01…EP10     Gmail + Telegram Bot     Modelo de IA (OpenAI)
   (un archivo por dominio)    (siempre vía WF09)       (solo lectura)
```

Principios que se cumplen:

- **El frontend es cliente.** No calcula cupos, no decide estados, no valida duplicados ni hashea contraseñas.
- **El frontend nunca habla con Google Sheets.** No hay SDK ni claves de Google en Next.js; toda lectura y escritura pasa por n8n.
- **Un archivo de Sheets por dominio** (EP01…EP10). Cada workflow escribe su información principal solo en su archivo y puede leer los de otros dominios.
- **Borrado lógico siempre.** Ningún workflow elimina filas; se cambian estados.
- **Cupos disponibles = capacidad − inscripciones CONFIRMADAS**, calculado en n8n en cada consulta. No existe una columna de cupos.

---

## 3. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript estricto, Tailwind CSS v4, fuentes Bricolage Grotesque y Figtree (`next/font`) |
| Hosting | Vercel |
| Automatización y backend | n8n Cloud (Webhook, Form Trigger, Schedule Trigger, Telegram Trigger, Chat Trigger, Execute Sub-workflow, Code, IF/Switch, Filter, Google Sheets, Gmail, Telegram, AI Agent) |
| Persistencia | Google Sheets (10 archivos independientes) |
| Notificaciones | Gmail (OAuth2) + Telegram Bot API |
| IA | Agente de n8n con modelo OpenAI `gpt-4o-mini` y memoria por conversación |
| Chat embebido | `@n8n/chat` |
| Utilidades | Google Apps Script (creación de los Sheets), Node.js (generador de workflows `scripts/n8n/`) |

---

## 4. Workflows, triggers y Google Sheets

Los JSON se exportaron desde la instancia de n8n y están en [`n8n/`](n8n/).

| Workflow | Archivo JSON | Trigger | Google Sheets (escritura principal) | Lee además |
|---|---|---|---|---|
| WF01 Usuarios CRUD | `WF01_usuarios_crud.json` | Webhook `POST /webhook/ep/usuarios` | **EP01_Usuarios** (Usuarios, Auditoria_Usuarios) | EP02 (vía WF11), EP03 |
| WF02 Autenticación y sesiones | `WF02_auth_sesiones.json` | Webhook `POST /webhook/ep/auth` | **EP02_Sesiones** (Sesiones) | EP01 |
| WF03 Vinculación Telegram | `WF03_vinculacion_telegram.json` | Webhook `POST /webhook/ep/telegram` + **Telegram Trigger** | **EP03_Telegram** (Codigos_Vinculacion, Vinculaciones) | EP02 (vía WF11) |
| WF04 Eventos CRUD | `WF04_eventos_crud.json` | **n8n Form Trigger** (Basic Auth) | **EP04_Eventos** (Eventos, Auditoria_Eventos) | EP06 (avisar a inscritos si se cancela) |
| WF05 Catálogo público | `WF05_catalogo_publico.json` | Webhook `GET /webhook/ep/catalogo` | **EP05_Catalogo_Log** (Consultas_Catalogo) | EP04, EP06 |
| WF06 Inscripciones CRUD | `WF06_inscripciones_crud.json` | Webhook `POST /webhook/ep/inscripciones` | **EP06_Inscripciones** (Inscripciones, Auditoria_Inscripciones) | EP01, EP02 (vía WF11), EP03, EP04 |
| WF07 Reasignación lista de espera | `WF07_reasignacion_lista_espera.json` | **Schedule Trigger** (cada 5 min) | **EP07_Reasignaciones** (+ cambio de estado en EP06) | EP04, EP06 |
| WF08 Recordatorios | `WF08_recordatorios.json` | **Schedule Trigger** (cada 15 min) | **EP08_Recordatorios** | EP04, EP06 |
| WF09 Notificaciones | `WF09_notificaciones.json` | **Execute Sub-workflow Trigger** | **EP09_Notificaciones** | EP01, EP03 |
| WF10 EventPass Assistant | `WF10_eventpass_assistant.json` | **Chat Trigger** | **EP10_Soporte** (Conversaciones, Mensajes) | EP04, EP06 (solo lectura) |
| WF11 Validar sesión *(adicional)* | `WF11_validar_sesion.json` | **Execute Sub-workflow Trigger** | EP02_Sesiones (`ultima_validacion`, marca EXPIRADA) | EP01 |

**WF11 es un workflow adicional.** Centraliza la validación de sesión, que reutilizan WF01, WF02 (acción `validar`), WF03 y WF06, para no duplicar esa lógica en cuatro lugares.

**WF07 también escribe en EP06,** porque la inscripción vive allí. Solo cambia el estado de LISTA_ESPERA a CONFIRMADA. Su registro principal, la reasignación, va en EP07.

Las columnas exactas de cada hoja están en [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md). Los nodos de cada workflow tienen nombres por responsabilidad, por ejemplo `Validar datos`, `Leer usuarios (EP01)`, `¿Email duplicado?`, `Generar hash + salt`, `Calcular cupos (capacidad − CONFIRMADAS)`, `Responder JSON`.

---

## 5. Comunicación frontend → n8n

1. Los componentes nunca hacen `fetch` directo: llaman funciones de `src/lib/api/*.ts`, con un archivo por workflow (`usuarios.ts`, `auth.ts`, `telegram.ts`, `catalogo.ts`, `inscripciones.ts`).
2. Esas funciones llaman a `/api/n8n/<ruta>` en el mismo dominio, así que no hay CORS.
3. El route handler `src/app/api/n8n/[...path]/route.ts` (el **proxy**) reenvía método, query, body y `Authorization` a `N8N_WEBHOOK_BASE_URL/ep/<ruta>`, y agrega el header secreto **`X-EP-Key`**. Esta clave vive solo en el servidor de Vercel y nunca llega al navegador. El proxy no tiene lógica de negocio.
4. En n8n, cada Webhook valida `X-EP-Key` con una credencial **Header Auth**. Sin la clave, n8n responde **403**.
5. n8n ejecuta las reglas y responde siempre con el mismo formato:
   ```json
   { "ok": true,  "data": { … } }
   { "ok": false, "error": { "code": "EMAIL_DUPLICADO", "message": "Ya existe una cuenta con ese correo." } }
   ```
   El status HTTP corresponde al resultado (200, 201, 400, 401, 404, 409, 500).
6. La sesión viaja como `Authorization: Bearer <session_token>`. El token se guarda en `localStorage` (`ep_token`) y lo gestiona solo `src/context/AuthContext.tsx`.
7. El catálogo y el chat envían un `visitor_id` anónimo: un UUID generado una vez y guardado en `localStorage`.
8. El chat no pasa por el proxy. El widget `@n8n/chat` se conecta directo al **Chat Trigger** de WF10, cuya URL pública está en `NEXT_PUBLIC_N8N_CHAT_URL`. Se restringe con *Allowed Origins* a `localhost:3000` y al dominio de Vercel.

---

## 6. Endpoints implementados

Todos los endpoints viven bajo `https://<instancia>.app.n8n.cloud/webhook/` y exigen `X-EP-Key`. El contrato completo, con ejemplos de request y response y los códigos de error, está en [`docs/CONTRATOS_API.md`](docs/CONTRATOS_API.md).

| Método | Ruta | Acciones (`accion` en el body) | Sesión |
|---|---|---|---|
| POST | `/ep/usuarios` | `registrar` | No |
| POST | `/ep/usuarios` | `perfil` · `actualizar` · `desactivar` | Sí |
| POST | `/ep/auth` | `login` | No |
| POST | `/ep/auth` | `logout` · `validar` | Sí |
| POST | `/ep/telegram` | `generar_codigo` · `estado` | Sí |
| GET | `/ep/catalogo` | listado · filtro (`?categoria=`) · detalle (`?evento_id=`) | No |
| POST | `/ep/inscripciones` | `crear` · `listar` · `actualizar` · `cancelar` | Sí |

| Otros puntos de entrada | Tipo |
|---|---|
| Formulario de administración de eventos (WF04) | URL `/form/<id>` del Form Trigger, con Basic Auth. Acciones: CREATE, READ, UPDATE, PUBLICAR, CERRAR, CANCELAR |
| Bot de Telegram (WF03) | Comando `/vincular CODIGO` |
| Chat del asistente (WF10) | URL `/webhook/<id>/chat` del Chat Trigger |

**Códigos de error:** `DATOS_INVALIDOS`, `ACCION_DESCONOCIDA`, `EMAIL_DUPLICADO`, `USUARIO_NO_ENCONTRADO`, `CREDENCIALES_INVALIDAS`, `USUARIO_INACTIVO`, `SESION_INVALIDA`, `TELEGRAM_YA_VINCULADO`, `EVENTO_NO_ENCONTRADO`, `EVENTO_NO_DISPONIBLE`, `TELEGRAM_NO_VINCULADO`, `INSCRIPCION_DUPLICADA`, `INSCRIPCION_NO_ENCONTRADA`, `INSCRIPCION_YA_CANCELADA`, `ERROR_INTERNO`.

---

## 7. Estados utilizados

| Entidad (hoja) | Estados |
|---|---|
| Usuario (EP01) | `ACTIVO`, `INACTIVO` |
| Sesión (EP02) | `ACTIVA`, `CERRADA`, `EXPIRADA` |
| Código de vinculación (EP03) | `PENDIENTE`, `USADO`, `EXPIRADO`, `CANCELADO` |
| Vinculación Telegram (EP03) | `ACTIVA`, `INACTIVA` |
| Evento (EP04) | `BORRADOR`, `PUBLICADO`, `CERRADO`, `CANCELADO` |
| Consulta de catálogo (EP05, tipo) | `LISTADO`, `DETALLE`, `FILTRO` |
| Inscripción (EP06) | `CONFIRMADA`, `LISTA_ESPERA`, `CANCELADA` |
| Recordatorio (EP08) | `PENDIENTE`, `ENVIADO`, `ERROR`, `OMITIDO` (tipos `R24H`, `R1H`) |
| Canal de notificación (EP09) | `PENDIENTE`, `ENVIADO`, `ERROR`, `NO_APLICA` |
| Conversación (EP10) | `ABIERTA`, `CERRADA` · roles de mensaje `USER`, `ASSISTANT`, `SYSTEM` |

El catálogo calcula además una **disponibilidad** derivada para el frontend: `DISPONIBLE`, `LLENO`, `CERRADO` y `CANCELADO`. Los eventos en `BORRADOR` nunca se muestran.

**No hay borrado físico.** Desactivar una cuenta pasa al usuario a `INACTIVO`, cancelar un evento lo pasa a `CANCELADO` y cancelar una inscripción la pasa a `CANCELADA`. Cada operación relevante queda en las hojas `Auditoria_*`, tanto si sale bien como si falla.

---

## 8. Hashing de contraseñas

Lo hace **WF01** en el Code Node *Generar hash + salt*, con el módulo `crypto` de Node:

1. Genera un **salt aleatorio de 16 bytes** (`crypto.randomBytes(16)`).
2. Calcula **PBKDF2-SHA512** con **100 000 iteraciones** y una clave de 64 bytes: `crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')`.
3. Guarda en EP01 `password_hash` y `password_salt` en hexadecimal. **La contraseña en texto plano nunca se almacena ni se registra.**

En el **login (WF02)**, el Code Node *Verificar password (hash + salt)* recalcula el hash con el salt guardado y lo compara con `crypto.timingSafeEqual`, que tarda lo mismo acierte o no y así evita ataques de tiempo. El mismo procedimiento se usa para cambiar la contraseña desde el perfil (pide la actual) y para desactivar la cuenta (pide confirmar con la contraseña).

El email se normaliza (minúsculas, sin espacios) antes de buscar duplicados, así que `Laura@Correo.com` y `laura@correo.com` son la misma cuenta.

---

## 9. Manejo de sesiones

- **Login (WF02):** con credenciales válidas y usuario ACTIVO, genera un `session_token` aleatorio de **32 bytes (hex)** y crea una fila `ACTIVA` en EP02 con `creada_en` y `expira_en` (**+12 h**).
- **Validación (WF11):** cada petición privada pasa por este sub-workflow. La sesión es **inválida** si:
  - el token no existe;
  - está `CERRADA`;
  - ya venció (en ese caso se marca `EXPIRADA`);
  - el usuario está `INACTIVO`.

  Si es válida, actualiza `ultima_validacion` y devuelve el `usuario_id`; si no, el workflow que llamó responde `401 SESION_INVALIDA`.
- **Logout:** marca la sesión `CERRADA` con `cerrada_en`.
- **Desactivar la cuenta:** cierra todas las sesiones activas del usuario.
- **Frontend:** al cargar la app, `AuthContext` valida el token guardado contra WF02 (`validar`). Si n8n lo rechaza, borra la sesión local. El frontend nunca decide por sí mismo si una sesión es válida.

No se usa JWT: el token es opaco y su validez la decide siempre n8n consultando EP02.

---

## 10. Idempotencia

| Caso | Mecanismo |
|---|---|
| **Inscripciones** (`usuario_id + evento_id`) | Antes de crear, WF06 busca en EP06 una inscripción `CONFIRMADA` o `LISTA_ESPERA` del mismo usuario para el mismo evento. Si existe, responde `409 INSCRIPCION_DUPLICADA` y audita el intento como `RECHAZAR_DUPLICADO`. |
| **Recordatorios** | `clave_idempotencia = usuario_id\|evento_id\|tipo_recordatorio`. WF08 lee los recordatorios anteriores y, si la clave ya existe en cualquier estado (`ENVIADO`, `ERROR`, `OMITIDO`), no vuelve a enviarlo. Si la inscripción se detecta cuando falta ≤ 1 h, el `R24H` se registra una sola vez como `OMITIDO` y solo se envía el `R1H`. |
| **Notificaciones** | Cada llamada a WF09 lleva una clave del tipo `TIPO\|inscripcion_id` (por ejemplo `REASIGNACION\|INS-…`, `RECORDATORIO\|usuario\|evento\|R24H`). Si ya hay una notificación con esa clave enviada por algún canal, WF09 no la reenvía y devuelve el resultado anterior. |
| **Reasignaciones** | WF07 solo promueve inscripciones que siguen en `LISTA_ESPERA` y solo tantas como cupos libres haya en ese momento, así que repetir la ejecución no promueve de más. |
| **Códigos de Telegram** | Un código `USADO` o vencido no se acepta. Al generar un código nuevo, los `PENDIENTE` anteriores del usuario pasan a `CANCELADO`. Un usuario tiene como máximo una vinculación `ACTIVA`; si ya la tiene, `generar_codigo` responde `409 TELEGRAM_YA_VINCULADO`. |
| **Usuarios** | El email normalizado es único (`409 EMAIL_DUPLICADO`). |

---

## 11. Lista de espera y reasignación

**Al inscribirse (WF06):** n8n calcula `cupos = capacidad − CONFIRMADAS` del evento.
- Si `cupos > 0`, la inscripción queda **CONFIRMADA**.
- Si no, queda en **LISTA_ESPERA** con un `orden_espera` informativo, que la web muestra como "Tu turno: N".

En ambos casos se notifica por WF09: `INSCRIPCION_CONFIRMADA` o `LISTA_ESPERA`.

**Al cancelar (WF06):** la inscripción pasa a `CANCELADA` (borrado lógico), se notifica `INSCRIPCION_CANCELADA` y el cupo queda libre.

**Reasignación automática (WF07, Schedule cada 5 min):**
1. Lee los eventos `PUBLICADO` (EP04) y todas las inscripciones (EP06).
2. Para cada evento, calcula los cupos libres (`capacidad − CONFIRMADAS`).
3. Toma la lista de espera de ese evento ordenada por **`fecha_inscripcion ASC`**: tiene prioridad quien lleva más tiempo esperando.
4. Promueve **exactamente** tantas inscripciones como cupos libres haya. El resto sigue en `LISTA_ESPERA`.
5. Por cada promoción:
   - actualiza el estado en EP06 (`LISTA_ESPERA → CONFIRMADA`);
   - audita `PROMOVER`;
   - llama a WF09 con tipo `REASIGNACION`;
   - registra la fila en **EP07_Reasignaciones** con `orden_lista`, `estado_anterior`, `estado_nuevo` y `resultado_notificacion` (por ejemplo `gmail:ENVIADO|telegram:ENVIADO`).

Ejemplo: se liberan 2 cupos y hay 5 personas en espera. Las dos primeras por `fecha_inscripcion` pasan a CONFIRMADA y las otras 3 siguen en LISTA_ESPERA.

---

## 12. Servicio central de notificaciones

**WF09_notificaciones** es el **único** lugar que envía mensajes a usuarios. Lo invocan con *Execute Sub-workflow* WF04 (evento cancelado), WF06, WF07 y WF08.

- **Entrada:** `usuario_id`, `tipo`, `titulo`, `mensaje`, `evento_id`, `inscripcion_id` y `clave_idempotencia`.
- **Pasos:**
  1. Valida la entrada y revisa la idempotencia (ver la sección 10).
  2. Busca el email del usuario (EP01) y su `chat_id` activo (EP03).
  3. Registra la notificación en EP09 con ambos canales en `PENDIENTE`.
  4. Envía por **Gmail** y por **Telegram** en ramas **independientes**. Cada nodo de envío tiene una salida de error propia (`continueErrorOutput`), así que un fallo en un canal se registra como `ERROR` con su mensaje y no detiene ni oculta el otro.
  5. Actualiza **por separado** `gmail_estado` / `gmail_error` y `telegram_estado` / `telegram_error`. Si el usuario no tiene Telegram vinculado, ese canal queda `NO_APLICA`.
  6. Devuelve a quien lo llamó el resultado de cada canal.
- **Tipos:** `INSCRIPCION_CONFIRMADA`, `LISTA_ESPERA`, `REASIGNACION`, `INSCRIPCION_CANCELADA`, `EVENTO_CANCELADO`, `RECORDATORIO`.

---

## 13. Asistente IA (WF10) y sus restricciones

**Flujo:**
1. *Chat Trigger*.
2. *Identificar conversación y visitante*: el `sessionId` del widget se usa como `conversation_id`, y `usuario_id` y `visitor_id` llegan en la metadata.
3. Guarda o actualiza la conversación en `Conversaciones` (EP10) y guarda el mensaje del usuario (`USER`) en `Mensajes`.
4. Un **AI Agent** (modelo OpenAI `gpt-4o-mini` y memoria por conversación) responde usando una sola herramienta, **`consultar_catalogo`**, que es de **solo lectura**: devuelve los eventos publicados con su cupo calculado (EP04 y EP06).
5. Guarda la respuesta (`ASSISTANT`) en `Mensajes`.

Filtrando `Mensajes` por `conversation_id` se reconstruye la conversación completa.

**Puede responder sobre:** eventos, categorías, fechas, lugares, cupos, lista de espera, funcionamiento de EventPass, vinculación con Telegram, estados de inscripción y recordatorios.

**Restricciones (prompt del sistema + diseño):**
- **No puede** crear usuarios, iniciar sesión, inscribir, cancelar inscripciones, modificar eventos, cambiar cupos ni cambiar ningún estado. No tiene ninguna herramienta de escritura, así que aunque el modelo lo intentara, no podría hacerlo. Si se lo piden, explica cómo hacerlo en la web.
- No pide ni acepta contraseñas, códigos de vinculación ni datos sensibles.
- No revela detalles internos (n8n, Sheets, claves) y no inventa eventos: los datos salen siempre de la herramienta.
- Responde en español y en hora de Colombia.

El prompt completo está en el nodo *EventPass Assistant (agente IA)* del JSON y en `scripts/n8n/wf-asistente.mjs`.

---

## 14. Frontend

| Ruta | Pantalla | Workflow |
|---|---|---|
| `/` | Inicio: buscador, categorías, próximos eventos, cómo funciona, acceso al asistente | WF05 |
| `/eventos` | Catálogo: chips de categoría, búsqueda, orden, "solo con cupos" | WF05 |
| `/eventos/[id]` | Detalle: fecha, hora, lugar, disponibilidad y panel de inscripción | WF05, WF06 |
| `/registro`, `/login` | Crear cuenta e iniciar sesión | WF01, WF02 |
| `/perfil` | Datos, editar nombre o contraseña, desactivar cuenta | WF01 |
| `/telegram` | Código de vinculación con cuenta regresiva, instrucción `/vincular` y botón al bot | WF03 |
| `/mis-inscripciones` | Resumen, pestañas Activas / Historial, editar datos, cancelar con confirmación | WF06 |
| (todas) | Widget del asistente | WF10 |

- Cada pantalla que llama a la API maneja **loading** (skeletons o spinner), **éxito** y **error** (aviso con "Reintentar").
- Textos en español y fechas en `America/Bogota`.
- Accesibilidad:
  - controles nativos (`button`, `a`, `input`) con etiquetas visibles;
  - foco visible y contraste AA;
  - funciona a 375 px de ancho sin scroll horizontal.
- Diseño:
  - tokens de color por categoría y por estado en `src/app/globals.css` y `src/components/ui/tokens.ts`;
  - íconos SVG de trazo, sin dependencias de UI externas.

---

## 15. Datos de prueba

Se cargaron con el formulario de WF04, así que quedan en la auditoría. Los eventos cerrado y cancelado se crearon como PUBLICADO y luego se les aplicó CERRAR o CANCELAR, de modo que la auditoría muestra la transición.

| Evento | Categoría | Fecha | Capacidad | Estado | Caso que demuestra |
|---|---|---|---|---|---|
| Feria de Ciencias Intercolegial 2026 | Académico | 2026-10-10 | 120 | PUBLICADO | Con cupos disponibles |
| Taller de Robótica con Arduino | Tecnología | 2026-10-14 09:00 | 2 | PUBLICADO | **Lleno** y lista de espera (WF07) |
| Escuela de Padres: Uso Seguro de Redes | Comunidad | 2026-10-07 09:00 | 80 | PUBLICADO | **Próximo** (dispara recordatorios R24H/R1H) |
| Torneo Intercolegial de Microfútbol | Deportes | 2026-10-25 | 64 | PUBLICADO | Disponible |
| Muestra Cultural: Danzas Colombianas | Cultura | 2026-10-30 | 150 | **CANCELADO** | Cancelado |
| Olimpiadas de Matemáticas — Fase Local | Académico | 2026-10-28 | 60 | **CERRADO** | Cerrado |
| Jornada de Orientación Vocacional 11° | Comunidad | 2026-11-05 | 40 | BORRADOR | No aparece en el catálogo |

7 eventos en 5 categorías.

---

## 16. Variables de entorno (`.env.example`)

| Variable | Dónde | Uso |
|---|---|---|
| `N8N_WEBHOOK_BASE_URL` | Servidor (Vercel) | Base de los webhooks de producción, por ejemplo `https://<instancia>.app.n8n.cloud/webhook` |
| `EP_API_KEY` | Servidor, **secreto** | Valor del header `X-EP-Key` que valida n8n. Marcado como *Sensitive* en Vercel |
| `NEXT_PUBLIC_N8N_CHAT_URL` | Pública | URL del Chat Trigger de WF10 |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Pública | Usuario del bot (sin @) para el botón y las instrucciones de vinculación |
| `NEXT_PUBLIC_APP_NAME` | Pública | Nombre visible de la app |
| `NEXT_PUBLIC_USE_MOCKS` | Pública | `true` solo para desarrollo sin n8n (catálogo de ejemplo). En Vercel: `false` |

Las variables `NEXT_PUBLIC_*` llegan al navegador, por eso ninguna de ellas es secreta.

---

## 17. Cómo ejecutar el proyecto

### Frontend (local)
Requisitos: Node.js 20 o superior.
```bash
git clone https://github.com/Zato-creator/EventPass2.git
cd EventPass2
npm install
cp .env.example .env.local     # completar con los valores reales
npm run dev                    # http://localhost:3000
npm run lint && npm run build  # verificación antes de publicar
```
Con `NEXT_PUBLIC_USE_MOCKS=true` el catálogo funciona sin n8n, con datos de ejemplo.

### n8n y Google Sheets
La guía completa está en [`docs/N8N_PASO_A_PASO.md`](docs/N8N_PASO_A_PASO.md).
1. **Sheets:** ejecutar `scripts/google/crear_sheets.gs` en Google Apps Script. Crea la carpeta `EventPass_Colegios` con EP01…EP10, sus hojas y los encabezados exactos.
2. **Credenciales en n8n:** Google Sheets OAuth2, Gmail OAuth2, Telegram (token de @BotFather), Header Auth `X-EP-Key`, Basic Auth del formulario de administración y OpenAI.
3. **Importar los workflows** de [`n8n/`](n8n/): primero WF11 y WF09 (sub-workflows), luego el resto.
   - Asignar las credenciales y los IDs de los Sheets.
   - Publicar los 11 workflows (incluidos WF09 y WF11).
   - Como alternativa, se pueden regenerar con `node scripts/n8n/generar.mjs` a partir de `scripts/n8n/config.local.json`.
4. Copiar la URL del Chat Trigger de WF10 a `NEXT_PUBLIC_N8N_CHAT_URL` y agregar el dominio de Vercel en *Allowed Origins*.
5. Copiar la URL del Form Trigger de WF04 para administrar eventos.

### Vercel
Importar el repositorio de GitHub y cargar las 6 variables de entorno (Settings → Environment Variables). Cada `git push` a `main` despliega automáticamente.

### Prueba rápida por consola
```bash
BASE=https://<instancia>.app.n8n.cloud/webhook
curl -s "$BASE/ep/catalogo?visitor_id=prueba" -H "X-EP-Key: $EP_API_KEY"   # listado
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/ep/catalogo"                # sin clave → 403
```

---

## 18. Estructura del repositorio

```
/
├── src/                      # Frontend Next.js
│   ├── app/                  # Páginas (App Router) y proxy api/n8n/[...path]
│   ├── components/           # Header, Footer, EventoCard, InscripcionForm, ChatWidget, ui/*
│   ├── context/AuthContext.tsx
│   ├── lib/api/              # Una función por acción de cada workflow
│   ├── lib/fechas.ts         # Formato de fechas en America/Bogota
│   └── types/api.ts          # Tipos de los contratos
├── n8n/                      # JSON exportados desde n8n (WF01…WF11)
├── docs/
│   ├── CONTRATOS_API.md      # Contratos frontend ↔ n8n
│   ├── MODELO_DATOS.md       # Hojas, columnas, estados, IDs
│   ├── N8N_PASO_A_PASO.md    # Montaje de n8n, Sheets y credenciales
│   ├── SETUP_PASO_A_PASO.md  # Instalación, GitHub y Vercel
│   └── PLAN_19H.md           # Plan de trabajo
├── scripts/
│   ├── google/crear_sheets.gs   # Crea los 10 Google Sheets
│   └── n8n/                     # Generador de los workflows (Code nodes en JS legible)
├── .env.example
├── CLAUDE.md                 # Reglas de arquitectura y convenciones del proyecto
└── README.md
```

---

## 19. Seguridad

- **No están en el repositorio:**
  - `.env` ni `.env.local`;
  - la `EP_API_KEY`, el token del bot ni las credenciales OAuth de Google;
  - contraseñas reales;
  - `scripts/n8n/config.local.json` (IDs locales).

  Todo esto está en `.gitignore`.
- Los JSON exportados de n8n referencian las credenciales solo por nombre e ID; n8n no exporta los secretos. Se exportaron sin *pinned data*.
- Todos los webhooks exigen `X-EP-Key`. La clave solo vive en n8n y en el servidor de Vercel.
- El formulario de administración (WF04) está protegido con Basic Auth.
- Las contraseñas se guardan con PBKDF2-SHA512 y salt por usuario, y se comparan en tiempo constante.
- El asistente IA no tiene herramientas de escritura.

---

## 20. Limitaciones conocidas

- **Sin transacciones.** Google Sheets no tiene transacciones: dos inscripciones simultáneas al último cupo podrían leer el mismo conteo. Para reducir esa ventana, se relee justo antes de escribir y WF07 corrige la ocupación en cada ejecución. Para producción real se usaría una base de datos con bloqueo.
- **Latencia de los procesos periódicos.** La reasignación tarda hasta 5 minutos y los recordatorios hasta 15 minutos.
- **Imágenes externas.** Las imágenes de los eventos son URLs externas. Si una no carga, la tarjeta muestra el color y el ícono de su categoría.
