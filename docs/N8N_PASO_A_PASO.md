# n8n paso a paso (Google Sheets, credenciales, importación y activación)

Los 11 workflows **no se arman a mano**: `scripts/n8n/generar.mjs` produce JSON importables con los nodos ya nombrados por responsabilidad. Tú pones las credenciales y los IDs, importas, pruebas y al final exportas desde n8n a `n8n/` (eso es lo que se entrega).

Tiempo estimado: 45–60 min.

---

## 1. Bot de Telegram (5 min)
1. En Telegram abre **@BotFather** → `/newbot` → nombre `EventPass Colegios` → usuario, por ejemplo `EventPassColegiosBot`.
2. Guarda el **token** (secreto, nunca al repo) y el **usuario del bot** (sin @).

## 2. Clave del webhook `X-EP-Key` (1 min)
En la terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ese valor es tu `EP_API_KEY`. Va en n8n (credencial Header Auth), en `.env.local` y en Vercel. Nunca en el repo.

## 3. Crear los 10 Google Sheets (5 min)
1. Abre https://script.google.com → **Nuevo proyecto**.
2. Pega el contenido de `scripts/google/crear_sheets.gs`, guarda, elige `crearSheetsEventPass` → **Ejecutar** → autoriza.
3. En **Registro de ejecución** copia el bloque `"sheets": { … }` con los 10 IDs.

Se crea la carpeta `EventPass_Colegios` con EP01…EP10, cada uno con sus hojas, los encabezados exactos y las columnas en *texto sin formato*.

## 4. Credenciales en n8n Cloud (15 min)
Menú **Credentials → Add credential**. Usa estos nombres (el generador los referencia):

| Nombre sugerido | Tipo | Datos |
|---|---|---|
| `Google Sheets EventPass` | Google Sheets OAuth2 API | *Sign in with Google* con la cuenta dueña de la carpeta |
| `Gmail EventPass` | Gmail OAuth2 | *Sign in with Google* |
| `Telegram EventPass Bot` | Telegram API | El token de @BotFather |
| `EP API Key (X-EP-Key)` | Header Auth | Name: `X-EP-Key` · Value: tu `EP_API_KEY` |
| `Admin formulario eventos` | Basic Auth | Usuario y contraseña del administrador (protege el formulario de WF04) |
| `OpenAI EventPass` | OpenAI | n8n Cloud trae créditos gratis de OpenAI; si no, tu API key |

**ID de cada credencial:** ábrela y copia el último tramo de la URL (`…/credentials/<ID>`).

> Prueba rápida de `crypto`: crea un workflow temporal con un Code node `return [{json:{h:require('crypto').randomBytes(4).toString('hex')}}]` y ejecútalo. En n8n Cloud funciona; si fallara, avísale a Claude.

## 5. Configuración local y primera generación
```bash
cp scripts/n8n/config.example.json scripts/n8n/config.local.json
```
Completa en `config.local.json`: `n8nBaseUrl` (ej. `https://tuusuario.app.n8n.cloud`), `telegramBotUsername`, `chatAllowedOrigins`, el bloque `sheets` del paso 3 y los `id` de `credenciales`. `workflows` déjalo vacío por ahora.

```bash
node scripts/n8n/generar.mjs
```
Salen 11 archivos en `n8n/_import/` (carpeta ignorada por git).

## 6. Importar: primero los sub-workflows
1. En n8n: **Create workflow → ⋯ → Import from File…** → `n8n/_import/WF11_validar_sesion.json` → **Save**. Copia su ID de la URL (`…/workflow/<ID>`).
2. Igual con `WF09_notificaciones.json` → copia su ID.
3. Pon esos IDs en `config.local.json` → `"workflows": { "WF09": "…", "WF11": "…" }` y vuelve a generar:
   ```bash
   node scripts/n8n/generar.mjs
   ```
4. Importa los demás: WF01, WF02, WF03, WF04, WF05, WF06, WF07, WF08, WF10. Guarda cada uno.

Revisa en cada workflow que ningún nodo muestre un aviso rojo de credencial. Si aparece, ábrelo y elige la credencial de la lista.

## 7. Activar
Activa (toggle **Active**) WF01, WF02, WF03, WF04, WF05, WF06, WF07, WF08 y WF10.
WF09 y WF11 son sub-workflows: no necesitan activarse.
WF03 al activarse registra el webhook del bot de Telegram. Solo ese workflow debe tener Telegram Trigger con ese bot.

Usa siempre las URLs de producción `/webhook/…`, nunca `/webhook-test/…`.

## 8. Pruebas rápidas por consola (Git Bash)
```bash
BASE=https://tuusuario.app.n8n.cloud/webhook
KEY=tu-EP_API_KEY
# Registro
curl -s -X POST $BASE/ep/usuarios -H "X-EP-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"accion":"registrar","nombre":"Laura Gómez","email":"laura@correo.com","password":"Clave1234"}'
# Login (copia session_token)
curl -s -X POST $BASE/ep/auth -H "X-EP-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"accion":"login","email":"laura@correo.com","password":"Clave1234"}'
# Perfil
curl -s -X POST $BASE/ep/usuarios -H "X-EP-Key: $KEY" -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"accion":"perfil"}'
# Catálogo
curl -s "$BASE/ep/catalogo?visitor_id=prueba" -H "X-EP-Key: $KEY"
# Sin X-EP-Key → 401 (lo hace n8n)
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/ep/catalogo"
```

## 9. Cargar los eventos de prueba (WF04)
Abre el nodo **Formulario administrador** de WF04 → pestaña *Production URL* → ábrela en el navegador (te pide el usuario/contraseña de Basic Auth).
Crea los 7 eventos de `docs/MODELO_DATOS.md` con **CREATE**. EVT-05 y EVT-06 se crean PUBLICADO y luego se les aplica **CANCELAR** y **CERRAR** con su ID (lo ves en la hoja Eventos o en el mensaje de confirmación).
Para el evento lleno (EVT-02, capacidad 2): dos usuarios de prueba con Telegram vinculado se inscriben desde la web; un tercero queda en LISTA_ESPERA.

## 10. Chat (WF10)
1. En WF10 abre **Chat Trigger** → copia la *Chat URL* (`…/webhook/8b2f6c1e-…/chat`).
2. Ponla en `NEXT_PUBLIC_N8N_CHAT_URL` (`.env.local` y Vercel).
3. En *Allowed Origins* del Chat Trigger deja `http://localhost:3000` y tu dominio de Vercel (`chatAllowedOrigins` del config).

## 11. Frontend conectado
`.env.local` (y las mismas variables en Vercel → Settings → Environment Variables):
```
N8N_WEBHOOK_BASE_URL=https://tuusuario.app.n8n.cloud/webhook
EP_API_KEY=<tu clave>
NEXT_PUBLIC_N8N_CHAT_URL=<chat url>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=EventPassColegiosBot
NEXT_PUBLIC_APP_NAME=EventPass Colegios
NEXT_PUBLIC_USE_MOCKS=false
```
Reinicia `npm run dev`. En Vercel, haz **Redeploy** después de cambiar variables.

## 12. Entrega: exportar desde n8n
Cuando todo funcione: en cada workflow **⋯ → Download** y guarda en `n8n/` con el nombre exacto:
`WF01_usuarios_crud.json`, `WF02_auth_sesiones.json`, `WF03_vinculacion_telegram.json`, `WF04_eventos_crud.json`, `WF05_catalogo_publico.json`, `WF06_inscripciones_crud.json`, `WF07_reasignacion_lista_espera.json`, `WF08_recordatorios.json`, `WF09_notificaciones.json`, `WF10_eventpass_assistant.json`, `WF11_validar_sesion.json`.
Antes: quita pinned data. Las credenciales salen solo por nombre/ID, sin secretos.

---

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| 401 en todo | `X-EP-Key` distinta entre n8n, `.env.local` y Vercel |
| 404 "webhook not registered" | Workflow no activado o estás usando `/webhook-test/` |
| WF01/WF06 fallan en "Validar sesión (WF11)" | ID de WF11 mal configurado: revisa el paso 6.3 |
| Nodo de Sheets: "Sheet with name … not found" | Falta una hoja o el ID del archivo es de otro EP |
| El bot no responde | WF03 inactivo, o otro workflow usa el mismo bot con Telegram Trigger |
| Chat con error CORS | Falta el dominio en *Allowed Origins* del Chat Trigger |
| El formulario de WF04 no muestra el resultado | En el Form Trigger, *Respond When* = "Workflow Finishes" |
