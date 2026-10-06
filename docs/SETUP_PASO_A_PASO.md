# Setup paso a paso (Windows + VS Code)

Tiempo estimado: 30–40 min la primera vez.
- **Parte 1:** la hace DEV-A (principal).
- **Parte 2:** la hace DEV-B (colaborador).
- **Partes 3 y 4:** para los dos.

---

## Parte 1 — DEV-A: crear y publicar el proyecto

### 1. Instalar herramientas (si no las tienes)

| Herramienta | Dónde | Nota |
|---|---|---|
| Node.js **LTS** | https://nodejs.org | Instalador con opciones por defecto |
| Git | https://git-scm.com/download/win | Opciones por defecto. En "default branch name" elige **main** si te lo pregunta |
| Cuenta de GitHub | https://github.com | Gratis |
| VS Code | https://code.visualstudio.com | Ya lo tienes, con la extensión de Claude |

Cierra y vuelve a abrir VS Code después de instalar. Luego abre una terminal (menú **Terminal → New Terminal**) y verifica:
```bash
node -v      # debe mostrar v20 o superior
git --version
```

### 2. Decirle a Git quién eres (una sola vez por computador)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo-de-github@ejemplo.com"
git config --global init.defaultBranch main
```

### 3. Abrir el proyecto
1. Descomprime `eventpass-colegios.zip`, por ejemplo en `Documentos\Proyectos\`.
2. En VS Code: **File → Open Folder…** y elige la carpeta `eventpass-colegios`.
   La carpeta que abras debe contener directamente `package.json`; si ves otra carpeta `eventpass-colegios` adentro, abre esa.
3. Si VS Code pregunta "Do you trust the authors?", responde **Yes**.
4. Si aparece "This workspace has extension recommendations", instálalas (ESLint, Tailwind).

### 4. Instalar dependencias y configurar
En la terminal de VS Code:
```bash
npm install
npm install @n8n/chat
```
Crea tu archivo de variables locales a partir del ejemplo:
```bash
# PowerShell
Copy-Item .env.example .env.local
# Git Bash
cp .env.example .env.local
```
Crea el archivo `CLAUDE.local.md` en la raíz con esta única línea:
```
Soy DEV-A (principal).
```

### 5. Probar que funciona
```bash
npm run dev
```
Abre http://localhost:3000 → **Ver eventos**. Debes ver 6 eventos de ejemplo, que vienen del modo mock (`NEXT_PUBLIC_USE_MOCKS=true`).
Detén el servidor con `Ctrl + C` y verifica que compila:
```bash
npm run build
```

### 6. Publicar en GitHub desde VS Code
1. Abre el panel **Source Control** (icono de ramas a la izquierda, o `Ctrl + Shift + G`).
2. Pulsa **Publish to GitHub**.
3. Inicia sesión en GitHub cuando se abra el navegador y autoriza a VS Code.
4. Elige **Publish to GitHub public repository** con el nombre `eventpass-colegios`.
5. VS Code te muestra la lista de archivos a incluir.
   - Verifica que **NO** aparezcan `.env.local`, `CLAUDE.local.md` ni `node_modules` (el `.gitignore` ya los excluye).
   - Acepta.
6. Al terminar, VS Code ofrece **Open on GitHub**. Ya está el repo en línea.

Luego configura el repo para trabajar en `main` sin pisarse:
```bash
git config pull.rebase true
git config rebase.autoStash true
git branch --show-current     # debe decir: main
```
<details><summary>Alternativa por comandos (si no aparece el botón)</summary>

1. En github.com: **New repository** → nombre `eventpass-colegios`, público, **sin** README ni .gitignore → **Create**.
2. En la terminal:
```bash
git init
git add .
git commit -m "[A] chore: proyecto inicial"
git remote add origin https://github.com/TU-USUARIO/eventpass-colegios.git
git push -u origin main
```
</details>

### 7. Invitar a tu colaborador
En github.com, abre tu repo y ve a **Settings → Collaborators → Add people**. Escribe el usuario de GitHub de DEV-B y envía la invitación.

### 8. Conectar Vercel (para tener la URL desde ya)
1. Ve a https://vercel.com y entra con **Continue with GitHub**.
2. Haz clic en **Add New… → Project** e importa `eventpass-colegios`. El framework se detecta solo como Next.js.
3. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_USE_MOCKS` = `true` por ahora. Cuando WF05 esté listo cámbialo a `false` y haz *Redeploy*.
   - `N8N_WEBHOOK_BASE_URL` y `EP_API_KEY` cuando tengas n8n. Puedes agregarlas después.
4. Pulsa **Deploy**. Copia la URL (`https://eventpass-colegios-xxx.vercel.app`) en el README.

Cada `git push` a `main` vuelve a desplegar automáticamente.

---

## Parte 2 — DEV-B: unirse al proyecto

1. Instala lo mismo del paso 1 y configura Git (paso 2).
2. Acepta la invitación que llega a tu correo de GitHub.
3. En VS Code: `Ctrl + Shift + P` → **Git: Clone** → pega `https://github.com/USUARIO-DEV-A/eventpass-colegios.git` → elige carpeta → **Open**.
4. En la terminal:
```bash
npm install
git config pull.rebase true
git config rebase.autoStash true
```
5. Crea `.env.local` (copia de `.env.example`, como en el paso 4) y `CLAUDE.local.md` con:
```
Soy DEV-B (colaborador).
```
6. Ejecuta `npm run dev` y abre http://localhost:3000.

---

## Parte 3 — Trabajo diario (los dos)

Antes de empezar cada tarea:
```bash
git pull
```
Al terminar algo pequeño (cada 30–45 min):
```bash
npm run lint
npm run build
git status                       # revisa que solo cambiaste archivos TUYOS
git add src/app/eventos          # agrega rutas concretas, no "git add ." a ciegas
git commit -m "[B] ui(catalogo): filtro por categoría"
git pull                         # trae lo del compañero
git push
```
Desde la interfaz de VS Code equivale a:
1. Panel Source Control.
2. Pulsa **+** en tus archivos.
3. Escribe el mensaje.
4. Pulsa **Commit** y luego **Sync Changes**.

Con Claude en VS Code: abre el panel de Claude y empieza con *"Lee CLAUDE.md y dime qué me toca en el bloque actual del plan"*. Claude lee `CLAUDE.md` y tu `CLAUDE.local.md`, así sabe qué archivos puedes tocar.

---

## Parte 4 — Problemas comunes

| Problema | Solución |
|---|---|
| `npm` o `git` "no se reconoce como comando" | Cierra y abre VS Code. Si sigue, reinstala marcando "Add to PATH" |
| PowerShell: "la ejecución de scripts está deshabilitada" (npm.ps1) | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o cambia la terminal a **Git Bash** o **Command Prompt** con la flecha ˅ junto al **+** de la terminal |
| `git push` rechazado ("fetch first", "non-fast-forward") | Ejecuta `git pull` y luego `git push`. Nunca uses `--force` |
| Conflicto al hacer `git pull` | Lee la sección "Flujo Git" de `CLAUDE.md`. Si dudas, ejecuta `git rebase --abort` y avisa a tu compañero |
| Puerto 3000 ocupado | Next usa 3001 automáticamente. Mira la URL que imprime la terminal |
| El catálogo muestra "Faltan variables de entorno" | Pon `NEXT_PUBLIC_USE_MOCKS=true` en `.env.local` y reinicia `npm run dev` |
| Vercel falla al desplegar | Ejecuta `npm run build` localmente. Si falla ahí, el error es el mismo; arréglalo y haz push |
