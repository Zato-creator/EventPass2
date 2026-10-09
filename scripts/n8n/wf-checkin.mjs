// WF12 (check-in digital).  Extensión de examen; no modifica los workflows existentes.
//
//   node scripts/n8n/wf-checkin.mjs
//
// Escribe n8n/WF12_checkin_digital.json. El documentId de EP11 se toma de
// config.local.json → sheets.EP11_CHECKIN; si no está, queda REEMPLAZAR_ID_EP11_CHECKIN.
// (Se llama WF12 porque WF11 ya es WF11_validar_sesion.)
/* global $, $input */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Workflow } from "./lib.mjs";

const CHECKINS = ["checkin_id", "inscripcion_id", "evento_id", "usuario_id", "fecha_checkin", "resultado", "detalle"];

export function wf12(cfg) {
  const wf = new Workflow("WF12_checkin_digital", cfg);

  // ── Entrada ──
  wf.webhook("Webhook", "ep/checkin-digital");
  wf.code("Leer solicitud", function () {
    const req = $('Webhook').first().json;
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const inscripcion_id = String(b.inscripcion_id ?? '').trim();
    const evento_id = String(b.evento_id ?? '').trim();
    return [{ json: { inscripcion_id, evento_id, datos_completos: !!inscripcion_id && !!evento_id } }];
  });
  wf.si("¿Datos completos?", "$json.datos_completos === true");
  wf.chain("Webhook", "Leer solicitud", "¿Datos completos?");

  // ── Lecturas (filtradas; alwaysOutputData para que una búsqueda vacía no detenga el flujo) ──
  const sol = (c) => `={{ $('Leer solicitud').first().json.${c} }}`;
  wf.leer("Leer inscripción (EP06)", "EP06", "Inscripciones", { columna: "inscripcion_id", valor: sol("inscripcion_id") });
  wf.leer("Leer evento (EP04)", "EP04", "Eventos", { columna: "evento_id", valor: sol("evento_id") });
  wf.leer("Leer historial de check-ins (EP11)", "EP11_CHECKIN", "Checkins", { columna: "inscripcion_id", valor: sol("inscripcion_id") });
  wf.code("Preparar validaciones", function () {
    const s = $('Leer solicitud').first().json;
    const i = filas('Leer inscripción (EP06)').find((x) => String(x.inscripcion_id) === s.inscripcion_id);
    const e = filas('Leer evento (EP04)').find((x) => String(x.evento_id) === s.evento_id);
    const previos = filas('Leer historial de check-ins (EP11)').filter((c) => String(c.inscripcion_id) === s.inscripcion_id && c.resultado === 'EXITOSO');
    return [{ json: {
      inscripcion_id: s.inscripcion_id, evento_id: s.evento_id,
      usuario_id: i ? String(i.usuario_id) : '',
      estado_actual: i ? String(i.estado) : '',
      evento_inscripcion: i ? String(i.evento_id) : '',
      evento_nombre: e ? String(e.nombre) : '', evento_fecha: e ? String(e.fecha).slice(0, 10) : '', evento_hora: e ? String(e.hora || '').slice(0, 5) : '',
      inscripcion_existe: !!i,
      evento_existe: !!e,
      pertenece_al_evento: !!i && String(i.evento_id) === s.evento_id,
      es_duplicado: previos.length > 0 || (!!i && i.estado === 'ASISTIO'),
      esta_confirmada: !!i && i.estado === 'CONFIRMADA',
    } }];
  });
  wf.link("¿Datos completos?", "Leer inscripción (EP06)", 0);
  wf.chain("Leer inscripción (EP06)", "Leer evento (EP04)", "Leer historial de check-ins (EP11)", "Preparar validaciones");

  // ── Validaciones, en este orden: existe inscripción → existe evento → pertenece → duplicado → CONFIRMADA ──
  wf.si("¿Inscripción existe?", "$json.inscripcion_existe === true");
  wf.si("¿Evento existe?", "$('Preparar validaciones').first().json.evento_existe === true");
  wf.si("¿Pertenece al evento?", "$('Preparar validaciones').first().json.pertenece_al_evento === true");
  wf.si("¿Ingreso ya registrado? (anti-duplicado)", "$('Preparar validaciones').first().json.es_duplicado === true");
  wf.si("¿Estado CONFIRMADA?", "$('Preparar validaciones').first().json.esta_confirmada === true");
  wf.chain("Preparar validaciones", "¿Inscripción existe?");
  wf.link("¿Inscripción existe?", "¿Evento existe?", 0);
  wf.link("¿Evento existe?", "¿Pertenece al evento?", 0);
  wf.link("¿Pertenece al evento?", "¿Ingreso ya registrado? (anti-duplicado)", 0);
  wf.link("¿Ingreso ya registrado? (anti-duplicado)", "¿Estado CONFIRMADA?", 1);

  // Cada rama produce un veredicto { resultado, status, detalle } que converge en "Generar checkin_id y fecha".
  const veredicto = (name, resultado, status, detalle) =>
    wf.code(name, function () {
      return [{ json: { resultado: '__RESULTADO__', status: __STATUS__, detalle: `__DETALLE__` } }];
    }, { reemplazos: { __RESULTADO__: resultado, __STATUS__: String(status), __DETALLE__: detalle } });
  const pv = "${$('Preparar validaciones').first().json";
  veredicto("Veredicto: datos incompletos", "RECHAZADO", 400, "Faltan datos: se requieren inscripcion_id y evento_id");
  veredicto("Veredicto: inscripción inexistente", "RECHAZADO", 404, "Inscripción inexistente");
  veredicto("Veredicto: evento inexistente", "RECHAZADO", 404, "Evento inexistente");
  veredicto("Veredicto: otro evento", "RECHAZADO", 422, `La inscripción pertenece a otro evento (${pv}.evento_inscripcion})`);
  veredicto("Veredicto: duplicado", "DUPLICADO", 409, "El ingreso ya había sido registrado");
  veredicto("Veredicto: estado no permitido", "RECHAZADO", 422, `La inscripción no está CONFIRMADA (estado actual: ${pv}.estado_actual})`);
  veredicto("Veredicto: check-in exitoso", "EXITOSO", 200, "Check-in realizado correctamente");
  wf.link("¿Datos completos?", "Veredicto: datos incompletos", 1);
  wf.link("¿Inscripción existe?", "Veredicto: inscripción inexistente", 1);
  wf.link("¿Evento existe?", "Veredicto: evento inexistente", 1);
  wf.link("¿Pertenece al evento?", "Veredicto: otro evento", 1);
  wf.link("¿Ingreso ya registrado? (anti-duplicado)", "Veredicto: duplicado", 0);
  wf.link("¿Estado CONFIRMADA?", "Veredicto: estado no permitido", 1);
  wf.link("¿Estado CONFIRMADA?", "Veredicto: check-in exitoso", 0);

  // ── Registro de TODOS los intentos ──
  wf.code("Generar checkin_id y fecha", function () {
    const v = $input.first().json;
    const s = $('Leer solicitud').first().json;
    let usuario_id = '';
    try { usuario_id = $('Preparar validaciones').first().json.usuario_id; } catch (e) { usuario_id = ''; }
    return [{ json: {
      checkin_id: genId('CHK'), inscripcion_id: s.inscripcion_id, evento_id: s.evento_id, usuario_id,
      fecha_checkin: ahoraISO(), resultado: v.resultado, detalle: v.detalle, status: v.status,
    } }];
  });
  for (const n of ["datos incompletos", "inscripción inexistente", "evento inexistente", "otro evento", "duplicado", "estado no permitido", "check-in exitoso"])
    wf.link(`Veredicto: ${n}`, "Generar checkin_id y fecha");
  wf.agregarFila("Registrar intento (EP11)", "EP11_CHECKIN", "Checkins", CHECKINS, { src: "Generar checkin_id y fecha" });
  wf.si("¿Check-in EXITOSO?", "$('Generar checkin_id y fecha').first().json.resultado === 'EXITOSO'");
  wf.chain("Generar checkin_id y fecha", "Registrar intento (EP11)", "¿Check-in EXITOSO?");

  // ── Solo EXITOSO: CONFIRMADA → ASISTIO (solo la fila de esa inscripción) + notificación por WF09 ──
  const g = (c) => `={{ $('Generar checkin_id y fecha').first().json.${c} }}`;
  wf.actualizar("Marcar ASISTIO (EP06)", "EP06", "Inscripciones", "inscripcion_id", {
    inscripcion_id: g("inscripcion_id"),
    estado: "ASISTIO",
    fecha_actualizacion: g("fecha_checkin"),
  });
  wf.code("Preparar notificación (check-in)", function () {
    const c = $('Generar checkin_id y fecha').first().json;
    const v = $('Preparar validaciones').first().json;
    const hora = c.fecha_checkin.slice(0, 10) + ' ' + c.fecha_checkin.slice(11, 16);
    return [{ json: {
      usuario_id: c.usuario_id, tipo: 'CHECKIN_EXITOSO', titulo: `Ingreso registrado: ${v.evento_nombre}`,
      mensaje: `Tu ingreso a "${v.evento_nombre}" quedó registrado.\n🕒 ${hora} (hora Colombia)\n🎫 Check-in: ${c.checkin_id}`,
      evento_id: c.evento_id, inscripcion_id: c.inscripcion_id, clave_idempotencia: `CHECKIN_EXITOSO|${c.inscripcion_id}`,
    } }];
  });
  wf.subworkflow("Notificar check-in (WF09)", "WF09");
  wf.link("¿Check-in EXITOSO?", "Marcar ASISTIO (EP06)", 0);
  wf.chain("Marcar ASISTIO (EP06)", "Preparar notificación (check-in)", "Notificar check-in (WF09)", "Preparar respuesta");

  // ── Respuesta (formato estándar { ok, data | error }) ──
  wf.code("Preparar respuesta", function () {
    const c = $('Generar checkin_id y fecha').first().json;
    const data = {
      resultado: c.resultado, mensaje: c.detalle, checkin_id: c.checkin_id,
      inscripcion_id: c.inscripcion_id, evento_id: c.evento_id, fecha_checkin: c.fecha_checkin,
    };
    if (c.resultado === 'EXITOSO') return [ok(200, data)];
    const r = err(c.status, c.resultado, c.detalle);
    r.json._body.data = data;
    return [r];
  });
  wf.link("¿Check-in EXITOSO?", "Preparar respuesta", 1);
  wf.responder();
  wf.chain("Preparar respuesta", "Responder al cliente");
  return wf;
}

// Ejecución directa: genera n8n/WF12_checkin_digital.json
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const raiz = join(aqui, "..", "..");
  const rutaCfg = existsSync(join(aqui, "config.local.json")) ? join(aqui, "config.local.json") : join(aqui, "config.example.json");
  const cfg = JSON.parse(readFileSync(rutaCfg, "utf8"));
  const wf = wf12(cfg).toJSON();
  const texto = JSON.stringify(wf, null, 2);
  writeFileSync(join(raiz, "n8n", `${wf.name}.json`), texto + "\n");
  const pend = [...new Set([...texto.matchAll(/REEMPLAZAR_ID_(\w+)/g)].map((m) => m[1]))];
  console.log(`✔ n8n/${wf.name}.json (${wf.nodes.length} nodos)${pend.length ? ` · pendientes: ${pend.join(", ")}` : ""}`);
}
