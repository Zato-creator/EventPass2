// Genera los JSON importables de los 11 workflows en n8n/_import/.
//
//   node scripts/n8n/generar.mjs
//
// Lee scripts/n8n/config.local.json (no se sube al repo; copia config.example.json).
// Los JSON de n8n/_import/ se importan en n8n; los que se entregan en n8n/ son los
// EXPORTADOS desde n8n después de probarlos (Download), como exige el enunciado.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wf01, wf02, wf11 } from "./wf-cuentas.mjs";
import { wf03, wf09 } from "./wf-telegram-notif.mjs";
import { wf04, wf05 } from "./wf-eventos.mjs";
import { wf06, wf07, wf08 } from "./wf-inscripciones.mjs";
import { wf10 } from "./wf-asistente.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const rutaCfg = existsSync(join(aqui, "config.local.json")) ? join(aqui, "config.local.json") : join(aqui, "config.example.json");
const cfg = JSON.parse(readFileSync(rutaCfg, "utf8"));
console.log(`Configuración: ${rutaCfg}`);

const salida = join(raiz, "n8n", "_import");
mkdirSync(salida, { recursive: true });

const pendientes = new Set();
for (const build of [wf11, wf09, wf01, wf02, wf03, wf04, wf05, wf06, wf07, wf08, wf10]) {
  const wf = build(cfg).toJSON();
  const texto = JSON.stringify(wf, null, 2);
  for (const m of texto.matchAll(/REEMPLAZAR_ID_(\w+)/g)) pendientes.add(m[1]);
  writeFileSync(join(salida, `${wf.name}.json`), texto + "\n");
  console.log(`✔ ${wf.name}.json (${wf.nodes.length} nodos)`);
}

const credFaltantes = Object.entries(cfg.credenciales || {}).filter(([, c]) => !c.id).map(([k]) => k);
if (pendientes.size) console.log(`\n⚠ IDs sin configurar: ${[...pendientes].join(", ")} (quedan como REEMPLAZAR_ID_…).`);
if (credFaltantes.length) console.log(`⚠ Credenciales sin id (se asignan a mano en n8n): ${credFaltantes.join(", ")}`);
console.log(`\nArchivos en ${salida}`);
