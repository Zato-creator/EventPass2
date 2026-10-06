# CLAUDE.md — EventPass Colegios

Este archivo es la fuente de reglas para Claude (extensión de VS Code) y para los dos desarrolladores.
Léelo completo antes de generar o editar código. Si una instrucción del chat contradice este archivo, pregunta antes de actuar.

---

## 1. Contexto del proyecto

**EventPass Colegios** es una plataforma pública para gestionar eventos escolares (ferias de ciencia, torneos intercolegiales, escuelas de padres, muestras culturales, olimpiadas académicas, orientación vocacional).

- Frontend: **Next.js (App Router) + TypeScript + Tailwind CSS**, publicado en **Vercel**.
- Backend / lógica de negocio: **n8n** (webhooks, Form Trigger, Schedule Trigger, Telegram Trigger, Chat Trigger, Execute Sub-workflow).
- Persistencia: **Google Sheets** (10 archivos independientes, EP01…EP10).
- Notificaciones: **Gmail + Telegram** siempre, a través de WF09.
- Soporte: asistente IA informativo (WF10) embebido con `@n8n/chat`.

Documentos de referencia (leer antes de tocar algo relacionado):
- `docs/SETUP_PASO_A_PASO.md` — instalación, GitHub, Vercel y flujo diario.
- `docs/PLAN_19H.md` — plan de trabajo y bloques horarios.
- `docs/CONTRATOS_API.md` — contratos frontend ↔ n8n. **Es la ley.** Ningún lado cambia un contrato sin avisar.
- `docs/MODELO_DATOS.md` — columnas de cada Google Sheet, estados, IDs, datos de prueba.

---

## 2. Reglas de arquitectura (no negociables)

1. **El frontend es solo cliente.** Cero reglas de negocio en Next.js: no calcula cupos, no decide estados, no valida duplicados, no hashea contraseñas.
2. **El frontend nunca habla con Google Sheets.** Ni SDK de Google, ni API keys de Google en el frontend. Todo pasa por n8n.
3. Next.js llama a n8n a través del **proxy** `src/app/api/n8n/[...path]/route.ts`. El proxy solo reenvía (método, headers `Authorization`, body, query) y agrega `X-EP-Key`. **Está prohibido poner lógica de negocio en el proxy.**
4. El chat (WF10) se conecta directo al Chat Trigger de n8n con `@n8n/chat` (URL pública en `NEXT_PUBLIC_N8N_CHAT_URL`).
5. **Borrado lógico siempre.** Ningún workflow elimina filas de Sheets. Se cambian estados.
6. **Cupos disponibles = capacidad − inscripciones CONFIRMADAS**, calculado en n8n en cada consulta. Nunca se guarda un "cupos_disponibles" manual.
7. **Toda notificación a un usuario registrado pasa por WF09** (Execute Sub-workflow) e intenta Gmail **y** Telegram, registrando cada canal por separado.
8. Cada workflow escribe su información principal **solo en su archivo EPxx**. Puede leer otros archivos.
9. La validación de sesión se hace con el sub-workflow **WF11_validar_sesion** (workflow adicional), reutilizado por WF01, WF02 (`validar`), WF03 y WF06.
10. Categorías temáticas (colegios): **Académico, Deportes, Cultura, Tecnología, Comunidad**. No se agregan otras sin actualizar contratos.

---

## 3. Equipo, propiedad de archivos y forma de trabajar en `main`

Solo existe la rama `main`. No se crean ramas. Para no pisarnos, **cada archivo tiene dueño**.

> **Modo individual (vigente):** el enunciado exige entrega individual y el proyecto lo desarrolla una sola persona, que asume los roles DEV-A y DEV-B. Si `CLAUDE.local.md` dice "Soy DEV-A y DEV-B", Claude puede editar todos los archivos. La tabla se conserva por si se suma un colaborador.

| Dueño | Frontend | n8n / Sheets | Docs |
|---|---|---|---|
| **DEV-A (principal)** | `src/lib/**`, `src/types/**`, `src/context/**`, `src/app/api/**`, `middleware.ts`, `package.json`, `next.config.*`, `.env.example` | WF01, WF02, WF03, WF06, WF07, WF09, WF11 · EP01, EP02, EP03, EP06, EP07, EP09 | `CLAUDE.md`, `README.md`, `docs/CONTRATOS_API.md`, `docs/MODELO_DATOS.md` |
| **DEV-B (colaborador)** | `src/app/**` (páginas y layouts, excepto `src/app/api/**`), `src/components/**`, `src/app/globals.css`, `tailwind.config.*`, `public/**` | WF04, WF05, WF08, WF10 · EP04, EP05, EP08, EP10 | `docs/workflows/WF04.md`, `WF05.md`, `WF08.md`, `WF10.md`, `docs/capturas/**` |

Reglas de propiedad:
- **No edites archivos del otro desarrollador.** Si necesitas un cambio, pídelo por el chat del equipo (o deja un `// TODO(DEV-A): …` en TU archivo).
- `package.json`: solo DEV-A instala dependencias. Todas las dependencias previstas se instalan en el bloque 0.
- Si el contrato de un endpoint necesita cambiar: DEV-A actualiza `docs/CONTRATOS_API.md` y `src/types/**` en el mismo commit, y avisa.
- En n8n (instancia compartida) cada uno edita **solo sus workflows**. Cada uno exporta y sube **sus** JSON a `n8n/`.

### Saber quién soy (para Claude)
Cada desarrollador crea en su máquina un archivo **`CLAUDE.local.md`** (está en `.gitignore`) con una sola línea:
```
Soy DEV-A (principal).    # o: Soy DEV-B (colaborador).
```
Claude: antes de editar un archivo, verifica en la tabla de arriba que pertenece al dev actual. Si no le pertenece, **no lo edites**: explica qué cambio haría falta y en qué archivo.

### Flujo Git (solo `main`)
Configuración inicial (una vez):
```bash
git config pull.rebase true
git config rebase.autoStash true
```
Ciclo de trabajo:
```bash
git pull                          # antes de empezar cada tarea
# ... trabajo ...
npm run lint && npm run build     # debe pasar (frontend)
git add <solo mis archivos>       # nunca "git add ." a ciegas
git commit -m "[A] feat(wf06): crear inscripción con lista de espera"
git pull                          # rebase sobre lo último
git push
```
- Commits pequeños, **push cada 30–45 min como máximo**.
- Prefijo obligatorio: `[A]` o `[B]` + tipo: `feat`, `fix`, `ui`, `n8n`, `docs`, `chore`.
- **Prohibido** `git push --force`, `git reset --hard` sobre commits ya publicados, y reescribir historia.
- Si el rebase da conflicto en un archivo **del otro dev**, quédate con la versión que ya está en `main`: durante un rebase eso es `git checkout --ours <archivo>` (en rebase, "ours" = lo remoto y "theirs" = tu commit). Luego `git add <archivo>` y `git rebase --continue`, y avisa por chat.
- Si el conflicto es en un archivo **tuyo**, resuélvelo a mano. Si no entiendes el conflicto: `git rebase --abort` y pregunta.
- Nunca dejar `main` sin compilar. Si rompes el build, arreglarlo es la prioridad número uno.

---

## 4. Convenciones de código (frontend)

- TypeScript estricto. Prohibido `any` salvo en el proxy.
- Todas las llamadas a n8n viven en `src/lib/api/*.ts` (un archivo por workflow: `usuarios.ts`, `auth.ts`, `telegram.ts`, `catalogo.ts`, `inscripciones.ts`). Los componentes **nunca** hacen `fetch` directo.
- Respuesta estándar de n8n (ver contratos):
  ```ts
  type ApiOk<T> = { ok: true; data: T };
  type ApiError = { ok: false; error: { code: string; message: string } };
  ```
- Cada pantalla que llama a la API maneja los 3 estados obligatorios: **loading**, **éxito**, **error** (componentes `Loading`, `Alert` en `src/components/ui`).
- El token de sesión se guarda en `localStorage` (`ep_token`) y se envía como `Authorization: Bearer <token>`. Lo gestiona solo `src/context/AuthContext.tsx`.
- `visitor_id`: UUID generado una vez y guardado en `localStorage` (`ep_visitor_id`); se envía al catálogo y al chat.
- Textos de la interfaz en español. Fechas mostradas en zona `America/Bogota`.
- Componentes en PascalCase, hooks `useAlgo`, archivos de API en minúscula.
- Nada de secretos en el código. Variables públicas solo con prefijo `NEXT_PUBLIC_` y solo si no son secretas.

---

## 5. Convenciones de n8n

- Zona horaria de la instancia y de cada workflow: **America/Bogota**.
- Nombre de workflow en n8n = nombre del archivo sin `.json` (ej. `WF06_inscripciones_crud`).
- Webhooks bajo el prefijo `ep/` (ej. `/webhook/ep/inscripciones`). Todos validan el header `X-EP-Key` (Header Auth).
- Nombrar los nodos por responsabilidad, para que la evaluación los identifique: `Validar datos`, `Leer usuarios (EP01)`, `¿Email duplicado?`, `Generar hash + salt`, `Generar usuario_id`, `Responder 200`, etc.
- Toda rama termina en un nodo **Respond to Webhook** con el formato estándar `{ ok, data | error }` y el status HTTP correcto.
- IDs con prefijo + timestamp + aleatorio (ver `docs/MODELO_DATOS.md`).
- Fechas guardadas en ISO 8601 con offset (`2026-10-06T09:30:00-05:00`).
- Hash de contraseñas en Code Node con `crypto` (PBKDF2-SHA512, 100 000 iteraciones, salt de 16 bytes). Si la instancia es self-hosted, requiere `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
- Escrituras de auditoría en las hojas `Auditoria_*` en cada operación relevante (éxito y error).
- Antes de exportar: quitar datos sensibles de pinned data, verificar que las credenciales aparezcan solo por nombre.
- Exportar con **Download** desde n8n y guardar en `n8n/` con el nombre exacto obligatorio.

---

## 6. Seguridad

Nunca subir al repo: `.env`, `.env.local`, API keys, token del bot de Telegram, credenciales OAuth de Google, la `EP_API_KEY`, contraseñas reales. Solo `.env.example` con valores de ejemplo.
Claude: si detectas un secreto en un archivo a punto de commitearse, detente y avisa.

---

## 7. Lo que Claude NO debe hacer

- Inventar endpoints, campos o estados que no estén en `docs/CONTRATOS_API.md` / `docs/MODELO_DATOS.md`.
- Mover lógica de negocio al frontend "para ir más rápido".
- Editar archivos del otro desarrollador.
- Crear ramas, hacer force push o reescribir historia.
- Agregar dependencias sin que lo pida DEV-A.
- Borrar filas en Sheets o proponer borrado físico.

## 8. Definición de terminado (por tarea)

- Compila (`npm run build`) y pasa lint.
- Maneja loading / éxito / error.
- Probado contra el webhook real de n8n (no solo mocks).
- Si es workflow: JSON exportado en `n8n/`, hoja con encabezados correctos, auditoría escribiendo.
- Commit con prefijo y push hecho.
