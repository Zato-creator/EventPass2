# Plan de acción — 19 horas

Inicio: **lunes 5 oct 2026, 20:15** · Entrega: **martes 6 oct 2026, 15:15** (hora Colombia).
Congelamiento de código: **14:30**. Después de esa hora solo export de JSON, README y verificación.

## Análisis rápido del enunciado

Lo que más pesa en la evaluación no es la interfaz, sino que n8n sea **trazable y modular**: 10 workflows con los nodos identificables, 10 Google Sheets separados, borrado lógico, idempotencia (inscripciones, recordatorios, notificaciones) y notificaciones por los dos canales. Por eso:

- El camino crítico es **WF11 (sesión) → WF06 (inscripciones) → WF09 (notificaciones) → WF07 (reasignación)**. Lo lleva DEV-A desde temprano.
- El frontend se construye en paralelo contra los contratos de `docs/CONTRATOS_API.md`, con datos mock al principio.
- Los contratos se cierran en la primera hora. Después, cambiar un contrato cuesta tiempo a los dos.

Riesgos principales y mitigación:
| Riesgo | Mitigación |
|---|---|
| CORS entre Vercel y n8n | Proxy en Next.js (`/api/n8n/...`). El chat necesita "Allowed origins" en el Chat Trigger. |
| `crypto` bloqueado en Code Node | Verificarlo en el bloque 0. Plan B: `crypto.subtle` o SHA-256 iterado. |
| Credenciales Gmail OAuth / bot de Telegram tardan | Configurarlas en el bloque 0, antes de cualquier workflow. |
| Sheets no tiene transacciones (dos inscripciones simultáneas) | Releer inscripciones justo antes de escribir; documentar la limitación en el README. |
| Webhooks de prueba vs producción | Activar workflows y usar `/webhook/` (no `/webhook-test/`) desde el bloque 3. |
| Cansancio | Bloque de descanso de 4 h. Si no lo usan, es colchón. |

---

## Bloques

### Bloque 0 · 20:15 – 21:15 · Setup (los dos)

**Primero:** DEV-A sigue `docs/SETUP_PASO_A_PASO.md` (instalar herramientas, publicar el repo desde VS Code, invitar a DEV-B, conectar Vercel). DEV-B sigue la parte 2 del mismo documento.

**DEV-A**
- [ ] `docs/SETUP_PASO_A_PASO.md` completo: repo publicado, DEV-B invitado, Vercel desplegado.
- [ ] Crear en Drive la carpeta `EventPass_Colegios` y compartirla con DEV-B.
- [ ] Crear EP01, EP02, EP03, EP06, EP07, EP09 con las hojas y encabezados de `MODELO_DATOS.md`.
- [ ] En n8n: credenciales Google Sheets, Gmail (OAuth), Telegram (bot creado con @BotFather), Header Auth (`X-EP-Key`). Zona horaria America/Bogota.
- [ ] Probar un Code Node con `require('crypto')`.

**DEV-B**
- [ ] Parte 2 de `docs/SETUP_PASO_A_PASO.md` (clonar, instalar, `.env.local`, `CLAUDE.local.md`).
- [ ] Crear EP04, EP05, EP08, EP10 con sus hojas y encabezados.
- [ ] Credencial del modelo de IA en n8n (OpenAI / Gemini / la que tengan).
- [ ] Definir identidad visual: nombre, paleta, tipografía, logo simple.

**Checkpoint 0 (21:15):** los dos leen `CONTRATOS_API.md` y lo aprueban. Desde aquí el contrato queda congelado.

### Bloque 1 · 21:15 – 00:15
**DEV-A**
- [ ] WF11_validar_sesion (sub-workflow).
- [ ] WF01_usuarios_crud: registrar, perfil, actualizar, desactivar + auditoría.
- [ ] WF02_auth_sesiones: login, logout, validar.
- [ ] Frontend: proxy `api/n8n/[...path]`, `src/types`, `src/lib/api/usuarios.ts` y `auth.ts`, `AuthContext`.

**DEV-B**
- [ ] Layout, header/footer, componentes UI (`Button`, `Card`, `Badge`, `Loading`, `Alert`, `EmptyState`).
- [ ] Página catálogo + detalle de evento con datos **mock** que respeten el contrato de WF05.
- [ ] WF04_eventos_crud (Form Trigger): CREATE, READ, UPDATE, CANCEL/CLOSE + auditoría.
- [ ] Cargar los 7 eventos de prueba (`MODELO_DATOS.md`) usando el propio formulario de WF04.

**Checkpoint 1 (00:15):** registro + login funcionando por Postman/curl. Catálogo mock visible. `git pull` de los dos, build verde.

### Bloque 2 · 00:15 – 03:15
**DEV-A**
- [ ] WF09_notificaciones: Gmail y Telegram en ramas independientes con "Continue on error", registro por canal, clave de idempotencia.
- [ ] WF03_vinculacion_telegram: webhook `generar_codigo` / `estado` + Telegram Trigger `/vincular CODIGO`.
- [ ] `src/lib/api/telegram.ts`, `catalogo.ts`.

**DEV-B**
- [ ] WF05_catalogo_publico: listado, detalle, filtro, cálculo de cupos (lee EP06), log en EP05.
- [ ] Conectar catálogo y detalle a WF05 real (quitar mocks).
- [ ] Páginas: registro, login, perfil (ver, editar, desactivar) usando `AuthContext` y `lib/api`.

**Checkpoint 2 (03:15):** catálogo real desde n8n; registro/login/perfil desde la web; un mensaje de prueba llega por Gmail y Telegram desde WF09.

### Descanso · 03:15 – 07:15
Si no lo necesitan, adelanten el bloque 3.

### Bloque 3 · 07:15 – 10:15
**DEV-A**
- [ ] WF06_inscripciones_crud: crear (todas las validaciones + CONFIRMADA / LISTA_ESPERA + idempotencia), listar, actualizar, cancelar; auditoría; llamadas a WF09.
- [ ] `src/lib/api/inscripciones.ts`.
- [ ] Activar todos sus workflows (URLs de producción).

**DEV-B**
- [ ] Página "Vincular Telegram" (genera código, muestra instrucciones y estado).
- [ ] WF10_eventpass_assistant: Chat Trigger, agente IA con prompt de solo lectura, tool de lectura de EP04 (y cupos), persistencia en Conversaciones y Mensajes.
- [ ] Widget de chat con `@n8n/chat` (metadata: `visitor_id`, `usuario_id`).

**Checkpoint 3 (10:15):** inscribirse desde la web a un evento con cupo (CONFIRMADA) y a uno lleno (LISTA_ESPERA), con notificaciones en ambos canales.

### Bloque 4 · 10:15 – 12:15
**DEV-A**
- [ ] WF07_reasignacion_lista_espera (Schedule cada 5 min): orden por `fecha_inscripcion ASC`, registro en EP07, notificación.
- [ ] Página "Mis inscripciones" — **lógica**: hook `useInscripciones` en `src/lib`.
- [ ] Revisar variables de entorno en Vercel y redeploy con todo conectado.

**DEV-B**
- [ ] WF08_recordatorios (Schedule cada 15 min): R24H y R1H, clave `usuario|evento|tipo`, registro en EP08.
- [ ] Página "Mis inscripciones" — UI (listar, editar nombre de acreditación/observaciones, cancelar) usando el hook de DEV-A.
- [ ] Botón "Inscribirme" en el detalle, mostrando el estado resultante.

### Bloque 5 · 12:15 – 14:30 · Pruebas de punta a punta (los dos)
Ejecutar el guion de pruebas (abajo) **sobre la URL de Vercel**. Cada bug se asigna al dueño del archivo.

### Bloque 6 · 14:30 – 15:15 · Entrega
**DEV-A:** README completo, `.env.example`, revisión final de secretos (`git grep -i "token\|secret\|key"`), tag `v1.0`.
**DEV-B:** exportar WF04, WF05, WF08, WF10; documentos en `docs/workflows/`; capturas en `docs/capturas/`.
**DEV-A:** exportar WF01, 02, 03, 06, 07, 09, 11. Último push. Verificar que la URL de Vercel funcione en incógnito.

---

## Guion de pruebas (bloque 5)

1. Visitante ve catálogo, filtra por categoría, abre detalle → se registra en EP05 (LISTADO, FILTRO, DETALLE).
2. Registro con email duplicado → error `EMAIL_DUPLICADO`.
3. Login con contraseña errónea → `CREDENCIALES_INVALIDAS`. Login correcto → token.
4. Inscripción sin Telegram vinculado → `TELEGRAM_NO_VINCULADO`.
5. Vincular Telegram con `/vincular CODIGO`; reutilizar el mismo código → rechazado; código expirado → rechazado.
6. Inscribirse a evento con cupo → CONFIRMADA + Gmail + Telegram.
7. Repetir la inscripción → `INSCRIPCION_DUPLICADA` (no se crea otra fila).
8. Inscribirse al evento lleno → LISTA_ESPERA con `orden_espera`.
9. Cancelar una CONFIRMADA del evento lleno → en ≤5 min WF07 promueve al primero en espera y lo notifica; los demás siguen en espera.
10. Evento próximo → WF08 envía recordatorio una sola vez (correr el schedule dos veces y verificar `OMITIDO`/sin duplicado).
11. Inscripción a evento CANCELADO / CERRADO → `EVENTO_NO_DISPONIBLE`.
12. Logout → el token ya no valida. Usuario desactivado → su sesión deja de ser válida.
13. Chat: pregunta por fechas y cupos → responde. Pedirle "inscríbeme" → se niega y explica cómo hacerlo. Conversación reconstruible por `conversation_id`.
14. Simular falla de Gmail (credencial inválida temporal) → Telegram se envía y EP09 registra `gmail_estado=ERROR`, `telegram_estado=ENVIADO`.

## Puntos de sincronización
- Al inicio de cada bloque: mensaje corto en el chat del equipo con "voy a tocar: …".
- En cada checkpoint: los dos hacen `git pull`, `npm run build` y prueban juntos 5 minutos.
