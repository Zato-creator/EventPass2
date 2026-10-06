# EventPass Colegios

> Plataforma pública para la gestión de eventos escolares: catálogo, inscripciones con cupos y lista de espera, notificaciones por Gmail y Telegram, y un asistente IA de soporte. Toda la lógica de negocio corre en **n8n**.

| | |
|---|---|
| **Estudiante** | _[Nombre completo]_ |
| **Colaborador** | _[Nombre]_ |
| **URL pública (Vercel)** | _[https://eventpass-colegios.vercel.app]_ |
| **Bot de Telegram** | _[@EventPassColegiosBot]_ |

> ⚠️ Secciones marcadas con `TODO` se completan en el bloque 6 del plan (`docs/PLAN_19H.md`).

---

## 1. Descripción
EventPass Colegios permite a estudiantes, docentes y acudientes consultar eventos escolares (ferias de ciencia, torneos, escuelas de padres, muestras culturales), registrarse, vincular su Telegram, inscribirse y recibir confirmaciones, avisos de lista de espera, reasignaciones y recordatorios. La administración de eventos se hace exclusivamente desde formularios de n8n.

Categorías: Académico · Deportes · Cultura · Tecnología · Comunidad.

## 2. Arquitectura general
```
Navegador
   │
   ▼
Next.js en Vercel ── /api/n8n/* (proxy: agrega X-EP-Key) ──► n8n Webhooks (WF01, 02, 03, 05, 06)
   │                                                           │
   └── widget @n8n/chat ─────────────────────────────────────► Chat Trigger (WF10)
                                                               │
                         Form Trigger (WF04) · Schedule (WF07, WF08) · Telegram Trigger (WF03)
                                                               │
                                     Reglas de negocio + sub-workflows (WF09, WF11)
                                                               │
                                     Google Sheets EP01…EP10 (un archivo por dominio)
                                                               │
                                              Gmail · Telegram · Modelo de IA
```
El frontend **no** se conecta a Google Sheets ni contiene reglas de negocio.

## 3. Tecnologías
Next.js (App Router) · TypeScript · Tailwind CSS · Vercel · n8n · Google Sheets · Gmail · Telegram Bot API · `@n8n/chat` · _[modelo de IA usado]_.

## 4. Workflows

| Workflow | Archivo JSON | Trigger | Google Sheets (escritura) |
|---|---|---|---|
| WF01 Usuarios CRUD | `n8n/WF01_usuarios_crud.json` | Webhook `POST /ep/usuarios` | EP01_Usuarios |
| WF02 Autenticación y sesiones | `n8n/WF02_auth_sesiones.json` | Webhook `POST /ep/auth` | EP02_Sesiones |
| WF03 Vinculación Telegram | `n8n/WF03_vinculacion_telegram.json` | Webhook `POST /ep/telegram` + Telegram Trigger | EP03_Telegram |
| WF04 Eventos CRUD | `n8n/WF04_eventos_crud.json` | n8n Form Trigger | EP04_Eventos |
| WF05 Catálogo público | `n8n/WF05_catalogo_publico.json` | Webhook `GET /ep/catalogo` | EP05_Catalogo_Log |
| WF06 Inscripciones CRUD | `n8n/WF06_inscripciones_crud.json` | Webhook `POST /ep/inscripciones` | EP06_Inscripciones |
| WF07 Reasignación lista de espera | `n8n/WF07_reasignacion_lista_espera.json` | Schedule (cada 5 min) | EP07_Reasignaciones (+ estado en EP06) |
| WF08 Recordatorios | `n8n/WF08_recordatorios.json` | Schedule (cada 15 min) | EP08_Recordatorios |
| WF09 Notificaciones | `n8n/WF09_notificaciones.json` | Execute Sub-workflow Trigger | EP09_Notificaciones |
| WF10 EventPass Assistant | `n8n/WF10_eventpass_assistant.json` | Chat Trigger | EP10_Soporte |
| WF11 Validar sesión (adicional) | `n8n/WF11_validar_sesion.json` | Execute Sub-workflow Trigger | EP02_Sesiones (ultima_validacion / EXPIRADA) |

Columnas de cada hoja: [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md).

## 5. Comunicación frontend → n8n
1. Los componentes llaman funciones de `src/lib/api/*.ts`.
2. Esas funciones hacen `fetch` a `/api/n8n/<ruta>` (mismo dominio, sin CORS).
3. El route handler `src/app/api/n8n/[...path]/route.ts` reenvía a `N8N_WEBHOOK_BASE_URL/ep/<ruta>` agregando `X-EP-Key` (secreto que nunca llega al navegador).
4. n8n valida la cabecera (Header Auth), ejecuta la lógica y responde `{ ok, data | error }`.
5. La sesión viaja como `Authorization: Bearer <session_token>`.

## 6. Endpoints implementados
Detalle completo con ejemplos: [`docs/CONTRATOS_API.md`](docs/CONTRATOS_API.md).

| Método | Ruta | Acciones |
|---|---|---|
| POST | `/ep/usuarios` | registrar · perfil · actualizar · desactivar |
| POST | `/ep/auth` | login · logout · validar |
| POST | `/ep/telegram` | generar_codigo · estado |
| GET | `/ep/catalogo` | listado · filtro (`categoria`) · detalle (`evento_id`) |
| POST | `/ep/inscripciones` | crear · listar · actualizar · cancelar |

## 7. Estados utilizados
| Entidad | Estados |
|---|---|
| Usuario | ACTIVO, INACTIVO |
| Sesión | ACTIVA, CERRADA, EXPIRADA |
| Código Telegram | PENDIENTE, USADO, EXPIRADO, CANCELADO |
| Vinculación | ACTIVA, INACTIVA |
| Evento | BORRADOR, PUBLICADO, CERRADO, CANCELADO |
| Inscripción | CONFIRMADA, LISTA_ESPERA, CANCELADA |
| Recordatorio | PENDIENTE, ENVIADO, ERROR, OMITIDO |
| Canal de notificación | PENDIENTE, ENVIADO, ERROR, NO_APLICA |
| Conversación | ABIERTA, CERRADA |

No hay borrado físico: todo cambio de ciclo de vida es un cambio de estado.

## 8. Hashing de contraseñas
En WF01 un Code Node genera un salt aleatorio de 16 bytes y calcula PBKDF2-SHA512 (100 000 iteraciones, 64 bytes). Se guardan `password_hash` y `password_salt` en hex; la contraseña nunca se almacena. En WF02 otro Code Node recalcula el hash con el salt guardado y compara con `crypto.timingSafeEqual`. _TODO: captura del nodo._

## 9. Manejo de sesiones
Login exitoso → token aleatorio de 32 bytes (hex), fila ACTIVA en EP02 con `expira_en` = +12 h. El sub-workflow WF11 valida cada petición privada: la sesión es inválida si no existe, está CERRADA, está vencida (se marca EXPIRADA) o el usuario está INACTIVO. Logout la marca CERRADA. Desactivar la cuenta cierra todas sus sesiones.

## 10. Idempotencia
- **Inscripciones:** antes de crear se buscan inscripciones CONFIRMADA o LISTA_ESPERA con el mismo `usuario_id + evento_id`; si existe se responde `409 INSCRIPCION_DUPLICADA` y se audita el rechazo.
- **Recordatorios:** `clave_idempotencia = usuario_id|evento_id|tipo_recordatorio`; si la clave ya existe en EP08 (ENVIADO, ERROR u OMITIDO) no se vuelve a enviar. Si una inscripción se detecta cuando ya falta ≤1 h, el R24H se registra OMITIDO y solo se envía el R1H.
- **Notificaciones:** WF09 recibe una `clave_idempotencia` y no reenvía si ya fue enviada.
- **Códigos Telegram:** un código USADO no puede volver a usarse.
- Limitación conocida: Google Sheets no tiene transacciones; se relee justo antes de escribir para reducir la ventana de carrera. _TODO_

## 11. Lista de espera y reasignación
Si `capacidad − CONFIRMADAS ≤ 0`, la inscripción queda LISTA_ESPERA. WF07 (Schedule cada 5 min) recorre eventos PUBLICADOS, calcula cupos libres, ordena la lista por `fecha_inscripcion ASC` y promueve exactamente tantos usuarios como cupos haya. Cada promoción actualiza EP06, registra en EP07 y notifica por WF09. _TODO: ejemplo con capturas._

## 12. Servicio central de notificaciones
WF09 es el único lugar que envía mensajes. Recibe `usuario_id, tipo, titulo, mensaje, evento_id, inscripcion_id`, busca email (EP01) y `chat_id` (EP03), y envía por Gmail y Telegram en ramas independientes con manejo de error por canal. Registra `gmail_estado` y `telegram_estado` por separado, así una falla en un canal no oculta el resultado del otro.

## 13. Asistente IA (WF10) y restricciones
Chat Trigger + agente IA con herramientas de **solo lectura** sobre eventos y cupos. Responde sobre eventos, categorías, fechas, lugares, lista de espera, vinculación Telegram y estados. No puede crear usuarios, iniciar sesión, inscribir, cancelar, modificar eventos ni cupos: no tiene herramientas de escritura y el prompt lo prohíbe explícitamente. Cada conversación (`conversation_id`) y cada mensaje (USER / ASSISTANT) se guardan en EP10. _TODO: prompt final._

## 14. Variables de entorno (`.env.example`)
| Variable | Tipo | Uso |
|---|---|---|
| `N8N_WEBHOOK_BASE_URL` | servidor | Base de los webhooks de producción de n8n |
| `EP_API_KEY` | servidor (secreto) | Header `X-EP-Key` que valida n8n |
| `NEXT_PUBLIC_N8N_CHAT_URL` | pública | URL del Chat Trigger de WF10 |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | pública | Usuario del bot para las instrucciones de vinculación |
| `NEXT_PUBLIC_APP_NAME` | pública | Nombre visible |
| `NEXT_PUBLIC_USE_MOCKS` | pública | `true` solo en desarrollo: catálogo con datos de ejemplo. En Vercel `false` |

## 15. Cómo ejecutar
```bash
git clone <repo>
cd eventpass-colegios
npm install
cp .env.example .env.local     # completar valores
npm run dev                    # http://localhost:3000
```
n8n (guía completa en [`docs/N8N_PASO_A_PASO.md`](docs/N8N_PASO_A_PASO.md)):
1. Crear los 10 Google Sheets con `scripts/google/crear_sheets.gs` (Apps Script: crea carpeta, archivos, hojas y encabezados).
2. Crear credenciales en n8n (Google Sheets, Gmail, Telegram, Header Auth `X-EP-Key`, Basic Auth del formulario, OpenAI).
3. Importar los JSON de `n8n/` (o generarlos con `node scripts/n8n/generar.mjs` a partir de `scripts/n8n/config.local.json`), asignar credenciales y activar los workflows.

## 16. Documentación adicional
- [`docs/SETUP_PASO_A_PASO.md`](docs/SETUP_PASO_A_PASO.md) — instalación y flujo con GitHub/Vercel.
- [`docs/PLAN_19H.md`](docs/PLAN_19H.md) — plan de trabajo.
- [`docs/CONTRATOS_API.md`](docs/CONTRATOS_API.md) — contratos.
- [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md) — hojas y datos de prueba.
- [`docs/N8N_PASO_A_PASO.md`](docs/N8N_PASO_A_PASO.md) — Sheets, credenciales, importación y activación de workflows.
- `scripts/n8n/` — generador de los workflows (los Code nodes están escritos como JS legible). `scripts/google/` — script que crea los Sheets.
- `docs/workflows/` — detalle por workflow. `docs/capturas/` — evidencias.
