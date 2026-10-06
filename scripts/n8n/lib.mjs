// Utilidades para construir workflows de n8n como JSON importable.
// Los Code nodes se escriben como funciones JS normales y se serializa solo su cuerpo.
import { createHash } from "node:crypto";

const uuid = (seed) => {
  const h = createHash("md5").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// Cuerpo de una función como texto (sin la firma), con indentación normalizada.
export function cuerpo(fn) {
  const s = fn.toString();
  const lineas = s.slice(s.indexOf("{") + 1, s.lastIndexOf("}")).split("\n");
  while (lineas.length && !lineas[0].trim()) lineas.shift();
  while (lineas.length && !lineas[lineas.length - 1].trim()) lineas.pop();
  const sangria = Math.min(...lineas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lineas.map((l) => l.slice(sangria)).join("\n");
}

// Funciones comunes que se anteponen a cada Code node.
const HELPERS = `// ── utilidades EventPass (zona America/Bogota, UTC-5 sin horario de verano) ──
const BOGOTA_MS = 5 * 3600 * 1000;
const ahoraISO = (d = new Date()) => new Date(d.getTime() - BOGOTA_MS).toISOString().slice(0, 19) + '-05:00';
const genId = (p) => p + '-' + new Date(Date.now() - BOGOTA_MS).toISOString().slice(0, 19).replace(/[-T:]/g, '') + '-' + Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
const filas = (nodo) => $(nodo).all().map((i) => i.json).filter((r) => r && Object.entries(r).some(([k, v]) => k !== 'row_number' && v !== '' && v !== null && v !== undefined));
const inicioEvento = (e) => new Date(String(e.fecha).slice(0, 10) + 'T' + (String(e.hora || '00:00').slice(0, 5)) + ':00-05:00');
const ok = (status, data, extra = {}) => ({ json: { _status: status, _body: { ok: true, data }, ...extra } });
const err = (status, code, message, extra = {}) => ({ json: { _status: status, _body: { ok: false, error: { code, message } }, ...extra } });
const aud = (o) => ({ auditoria_id: genId('AUD'), fecha: ahoraISO(), ...o });
// ─────────────────────────────────────────────────────────────────────────────
`;

const cond = (expr, seed) => ({
  options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
  conditions: [
    {
      id: uuid(seed),
      leftValue: `={{ ${expr} }}`,
      rightValue: "",
      operator: { type: "boolean", operation: "true", singleValue: true },
    },
  ],
  combinator: "and",
});

export class Workflow {
  constructor(nombre, cfg) {
    this.nombre = nombre;
    this.cfg = cfg;
    this.nodes = [];
    this.conns = {};
  }

  add(name, type, typeVersion, parameters, extra = {}) {
    if (this.nodes.some((n) => n.name === name)) throw new Error(`${this.nombre}: nodo repetido "${name}"`);
    this.nodes.push({ parameters, id: uuid(`${this.nombre}/${name}`), name, type, typeVersion, position: [0, 0], ...extra });
    return name;
  }

  link(from, to, out = 0, inp = 0, tipo = "main") {
    const c = (this.conns[from] ??= {});
    const arr = (c[tipo] ??= []);
    while (arr.length <= out) arr.push([]);
    arr[out].push({ node: to, type: tipo, index: inp });
    return to;
  }

  chain(...names) {
    for (let i = 0; i < names.length - 1; i++) this.link(names[i], names[i + 1]);
    return names[names.length - 1];
  }

  cred(tipo) {
    const c = this.cfg.credenciales?.[tipo];
    const tipos = {
      googleSheets: "googleSheetsOAuth2Api",
      gmail: "gmailOAuth2",
      telegram: "telegramApi",
      headerAuth: "httpHeaderAuth",
      basicAuth: "httpBasicAuth",
      openAi: "openAiApi",
    };
    if (!c?.id) return {};
    return { credentials: { [tipos[tipo]]: { id: c.id, name: c.name } } };
  }

  // ── nodos ──
  code(name, fn, { porItem = false, reemplazos = {} } = {}) {
    let js = HELPERS + "\n" + cuerpo(fn);
    for (const [k, v] of Object.entries(reemplazos)) js = js.split(k).join(v);
    const p = { jsCode: js };
    if (porItem) p.mode = "runOnceForEachItem";
    return this.add(name, "n8n-nodes-base.code", 2, p);
  }

  webhook(name, path, method = "POST") {
    return this.add(
      name,
      "n8n-nodes-base.webhook",
      2,
      { httpMethod: method, path, authentication: "headerAuth", responseMode: "responseNode", options: {} },
      { webhookId: uuid(`webhook/${path}`), ...this.cred("headerAuth") },
    );
  }

  responder(name = "Responder al cliente") {
    return this.add(name, "n8n-nodes-base.respondToWebhook", 1.1, {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json._body) }}",
      options: { responseCode: "={{ $json._status }}" },
    });
  }

  si(name, expr) {
    return this.add(name, "n8n-nodes-base.if", 2.2, { conditions: cond(expr, `${this.nombre}/${name}`), options: {} });
  }

  filtro(name, expr) {
    return this.add(
      name,
      "n8n-nodes-base.filter",
      2.2,
      { conditions: cond(expr, `${this.nombre}/${name}`), options: {} },
      { alwaysOutputData: true },
    );
  }

  // reglas: [{ salida, expr }]. La salida "fallback" queda al final.
  switch(name, reglas, fallback = "otro") {
    return this.add(name, "n8n-nodes-base.switch", 3.2, {
      rules: {
        values: reglas.map((r, i) => ({
          conditions: cond(r.expr, `${this.nombre}/${name}/${i}`),
          renameOutput: true,
          outputKey: r.salida,
        })),
      },
      options: fallback ? { fallbackOutput: "extra", renameFallbackOutput: fallback } : {},
    });
  }

  agregar(name, campo) {
    return this.add(name, "n8n-nodes-base.aggregate", 1, {
      aggregate: "aggregateAllItemData",
      destinationFieldName: campo,
      options: {},
    });
  }

  subworkflow(name, wf, { porItem = false } = {}) {
    const id = this.cfg.workflows?.[wf] || `REEMPLAZAR_ID_${wf}`;
    return this.add(name, "n8n-nodes-base.executeWorkflow", 1.2, {
      workflowId: { __rl: true, value: id, mode: "id" },
      workflowInputs: {
        mappingMode: "defineBelow",
        value: {},
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      mode: porItem ? "each" : "once",
      options: { waitForSubWorkflow: true },
    });
  }

  inicioSubworkflow(name = "Inicio (Execute Sub-workflow)") {
    return this.add(name, "n8n-nodes-base.executeWorkflowTrigger", 1.1, { inputSource: "passthrough" });
  }

  // ── Google Sheets ──
  doc(ep) {
    const id = this.cfg.sheets?.[ep] || `REEMPLAZAR_ID_${ep}`;
    return { __rl: true, value: id, mode: "id" };
  }

  leer(name, ep, hoja, filtro) {
    const p = {
      operation: "read",
      documentId: this.doc(ep),
      sheetName: { __rl: true, value: hoja, mode: "name" },
      options: {},
    };
    if (filtro) p.filtersUI = { values: [{ lookupColumn: filtro.columna, lookupValue: filtro.valor }] };
    return this.add(name, "n8n-nodes-base.googleSheets", 4.5, p, {
      executeOnce: true,
      alwaysOutputData: true,
      ...this.cred("googleSheets"),
    });
  }

  // columnas: lista de nombres o { columna: expresión }. src: nodo del que se toman los valores.
  escribir(name, operacion, ep, hoja, columnas, { coincidir, src } = {}) {
    const lista = Array.isArray(columnas) ? columnas : Object.keys(columnas);
    const fuente = src ? `$('${src}').first().json` : "$json";
    const value = {};
    for (const c of lista) {
      const custom = Array.isArray(columnas) ? undefined : columnas[c];
      value[c] = custom ?? `={{ ${fuente}.${c} ?? '' }}`;
    }
    const p = {
      operation: operacion,
      documentId: this.doc(ep),
      sheetName: { __rl: true, value: hoja, mode: "name" },
      columns: {
        mappingMode: "defineBelow",
        value,
        matchingColumns: coincidir ? [coincidir] : [],
        schema: lista.map((c) => ({
          id: c,
          displayName: c,
          required: false,
          defaultMatch: false,
          display: true,
          type: "string",
          canBeUsedToMatch: true,
        })),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: { cellFormat: "RAW" },
    };
    return this.add(name, "n8n-nodes-base.googleSheets", 4.5, p, this.cred("googleSheets"));
  }

  agregarFila(name, ep, hoja, columnas, opts) {
    return this.escribir(name, "append", ep, hoja, columnas, opts);
  }

  actualizar(name, ep, hoja, coincidir, columnas, opts = {}) {
    const lista = Array.isArray(columnas) ? [coincidir, ...columnas.filter((c) => c !== coincidir)] : columnas;
    return this.escribir(name, "update", ep, hoja, lista, { ...opts, coincidir });
  }

  upsert(name, ep, hoja, coincidir, columnas, opts = {}) {
    return this.escribir(name, "appendOrUpdate", ep, hoja, columnas, { ...opts, coincidir });
  }

  // ── Layout automático por profundidad (izquierda → derecha) ──
  layout() {
    const principales = new Map(this.nodes.map((n) => [n.name, []]));
    const entrantes = new Map(this.nodes.map((n) => [n.name, 0]));
    const subnodos = new Map(); // nodo IA → agente
    for (const [from, tipos] of Object.entries(this.conns)) {
      for (const [tipo, salidas] of Object.entries(tipos)) {
        for (const destinos of salidas)
          for (const d of destinos) {
            if (tipo === "main") {
              principales.get(from).push(d.node);
              entrantes.set(d.node, entrantes.get(d.node) + 1);
            } else subnodos.set(from, d.node);
          }
      }
    }
    const col = new Map();
    const raices = this.nodes.filter((n) => entrantes.get(n.name) === 0 && !subnodos.has(n.name)).map((n) => n.name);
    const cola = raices.map((r) => [r, 0]);
    while (cola.length) {
      const [n, c] = cola.shift();
      if ((col.get(n) ?? -1) >= c) continue;
      if (c > this.nodes.length) continue; // seguridad ante ciclos
      col.set(n, c);
      for (const h of principales.get(n)) cola.push([h, c + 1]);
    }
    const filasPorCol = new Map();
    let filaRaiz = 0;
    for (const n of this.nodes) {
      if (subnodos.has(n.name)) continue;
      const c = col.get(n.name) ?? 0;
      let f = filasPorCol.get(c) ?? (raices.includes(n.name) ? filaRaiz : 0);
      if (raices.includes(n.name)) filaRaiz = f + 4;
      filasPorCol.set(c, f + 1);
      n.position = [c * 260, f * 200];
    }
    const porAgente = new Map();
    for (const [sub, agente] of subnodos) {
      const a = this.nodes.find((n) => n.name === agente);
      const k = porAgente.get(agente) ?? 0;
      porAgente.set(agente, k + 1);
      this.nodes.find((n) => n.name === sub).position = [a.position[0] - 160 + k * 180, a.position[1] + 240];
    }
  }

  toJSON() {
    // Validar que todas las conexiones apunten a nodos existentes.
    const nombres = new Set(this.nodes.map((n) => n.name));
    for (const [from, tipos] of Object.entries(this.conns)) {
      if (!nombres.has(from)) throw new Error(`${this.nombre}: conexión desde nodo inexistente "${from}"`);
      for (const salidas of Object.values(tipos))
        for (const destinos of salidas)
          for (const d of destinos)
            if (!nombres.has(d.node)) throw new Error(`${this.nombre}: conexión hacia nodo inexistente "${d.node}"`);
    }
    this.layout();
    return {
      name: this.nombre,
      nodes: this.nodes,
      connections: this.conns,
      pinData: {},
      active: false,
      settings: {
        executionOrder: "v1",
        timezone: "America/Bogota",
        saveManualExecutions: true,
        callerPolicy: "workflowsFromSameOwner",
      },
      tags: [],
    };
  }
}
