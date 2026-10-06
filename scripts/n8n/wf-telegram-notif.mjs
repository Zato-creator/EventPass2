// WF03 (vinculación Telegram) y WF09 (servicio central de notificaciones).
/* global $, $input, require */ // eslint-disable-line
import { Workflow } from "./lib.mjs";
import { C } from "./columnas.mjs";
import { entradaWebhook, bloqueSesion, respAccionDesconocida } from "./comunes.mjs";

// ───────────────────────────── WF03 ─────────────────────────────
export function wf03(cfg) {
  const wf = new Workflow("WF03_vinculacion_telegram", cfg);
  const R = { reemplazos: { __BOT_USERNAME__: cfg.telegramBotUsername || "EventPassColegiosBot" } };

  // ── Parte 1: webhook (usuario autenticado) ──
  const ultimo = entradaWebhook(wf, "ep/telegram");
  wf.responder();
  const valida = bloqueSesion(wf, ultimo);
  wf.leer("Leer vinculaciones (EP03)", "EP03", "Vinculaciones");
  wf.code("Buscar vinculación ACTIVA", function () {
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const v = filas('Leer vinculaciones (EP03)').find((x) => x.usuario_id === uid && x.estado === 'ACTIVA');
    return [{ json: { usuario_id: uid, vinculado: !!v, telegram_username: v ? (v.telegram_username || null) : null, fecha_vinculacion: v ? v.fecha_vinculacion : null } }];
  });
  wf.switch("Enrutar por operación", [
    { salida: "generar_codigo", expr: "$('Leer solicitud').first().json.accion === 'generar_codigo'" },
    { salida: "estado", expr: "$('Leer solicitud').first().json.accion === 'estado'" },
  ]);
  wf.link(valida, "Leer vinculaciones (EP03)", 0);
  wf.chain("Leer vinculaciones (EP03)", "Buscar vinculación ACTIVA", "Enrutar por operación");

  wf.code("Resp: estado de vinculación", function () {
    const v = $('Buscar vinculación ACTIVA').first().json;
    return [ok(200, { vinculado: v.vinculado, telegram_username: v.telegram_username, fecha_vinculacion: v.fecha_vinculacion })];
  });
  wf.link("Enrutar por operación", "Resp: estado de vinculación", 1);
  wf.link("Resp: estado de vinculación", "Responder al cliente");
  wf.code("Resp: acción desconocida", respAccionDesconocida);
  wf.link("Enrutar por operación", "Resp: acción desconocida", 2);
  wf.link("Resp: acción desconocida", "Responder al cliente");

  wf.si("¿Telegram ya vinculado?", "$('Buscar vinculación ACTIVA').first().json.vinculado === true");
  wf.code("Resp: Telegram ya vinculado", function () {
    return [err(409, 'TELEGRAM_YA_VINCULADO', 'Tu cuenta ya tiene Telegram vinculado.')];
  });
  wf.leer("Leer códigos (EP03)", "EP03", "Codigos_Vinculacion");
  wf.code("Códigos PENDIENTE anteriores", function () {
    const uid = $('Buscar vinculación ACTIVA').first().json.usuario_id;
    return filas('Leer códigos (EP03)')
      .filter((c) => c.usuario_id === uid && c.estado === 'PENDIENTE')
      .map((c) => ({ json: { codigo_id: c.codigo_id, estado: 'CANCELADO' } }));
  });
  wf.actualizar("Cancelar códigos anteriores (EP03)", "EP03", "Codigos_Vinculacion", "codigo_id", ["estado"]);
  wf.code("Generar código temporal", function () {
    const crypto = require('crypto');
    const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
    const uid = $('Buscar vinculación ACTIVA').first().json.usuario_id;
    const usados = new Set(filas('Leer códigos (EP03)').map((c) => String(c.codigo)));
    let codigo;
    do {
      codigo = Array.from(crypto.randomBytes(6), (b) => ALFABETO[b % ALFABETO.length]).join('');
    } while (usados.has(codigo));
    const ahora = new Date();
    return [{ json: {
      codigo_id: genId('COD'), usuario_id: uid, codigo,
      creado_en: ahoraISO(ahora),
      expira_en: ahoraISO(new Date(ahora.getTime() + 10 * 60 * 1000)), // vigencia 10 minutos
      estado: 'PENDIENTE', usado_en: '',
    } }];
  });
  wf.agregarFila("Guardar código (EP03)", "EP03", "Codigos_Vinculacion", C.Codigos_Vinculacion, { src: "Generar código temporal" });
  wf.code("Resp: código generado", function () {
    const c = $('Generar código temporal').first().json;
    return [ok(201, { codigo: c.codigo, expira_en: c.expira_en, bot_username: '__BOT_USERNAME__', instruccion: `/vincular ${c.codigo}` })];
  }, R);

  wf.link("Enrutar por operación", "¿Telegram ya vinculado?", 0);
  wf.link("¿Telegram ya vinculado?", "Resp: Telegram ya vinculado", 0);
  wf.link("Resp: Telegram ya vinculado", "Responder al cliente");
  wf.link("¿Telegram ya vinculado?", "Leer códigos (EP03)", 1);
  wf.chain("Leer códigos (EP03)", "Generar código temporal", "Guardar código (EP03)", "Resp: código generado", "Responder al cliente");
  wf.chain("Leer códigos (EP03)", "Códigos PENDIENTE anteriores", "Cancelar códigos anteriores (EP03)");

  // ── Parte 2: Telegram Trigger (/vincular CODIGO) ──
  wf.add("Telegram Trigger", "n8n-nodes-base.telegramTrigger", 1.1, { updates: ["message"], additionalFields: {} }, {
    webhookId: "c0a8e1f2-3b4d-4e5f-9a6b-7c8d9e0f1a2b",
    ...wf.cred("telegram"),
  });
  wf.code("Extraer código recibido", function () {
    const m = $('Telegram Trigger').first().json.message || {};
    const texto = String(m.text || '').trim();
    const coincide = texto.match(/^\/vincular(?:@\w+)?\s+([A-Za-z0-9]{6})\s*$/i);
    return [{ json: {
      chat_id: String((m.chat || {}).id ?? ''),
      telegram_username: (m.from || {}).username || '',
      texto,
      codigo: coincide ? coincide[1].toUpperCase() : null,
    } }];
  });
  wf.si("¿Es /vincular CODIGO?", "!!$json.codigo");
  const tg = (name, texto) =>
    wf.add(name, "n8n-nodes-base.telegram", 1.2, {
      chatId: "={{ $('Extraer código recibido').first().json.chat_id }}",
      text: texto,
      additionalFields: { appendAttribution: false },
    }, wf.cred("telegram"));
  tg("Responder instrucciones", "👋 Hola, soy el bot de EventPass Colegios.\n\nPara vincular tu cuenta:\n1. Inicia sesión en la web.\n2. Entra a la sección Telegram y genera un código.\n3. Envíame: /vincular CODIGO");
  wf.leer("Buscar código (EP03)", "EP03", "Codigos_Vinculacion");
  wf.code("Validar código y vigencia", function () {
    const e = $('Extraer código recibido').first().json;
    const c = filas('Buscar código (EP03)').find((x) => String(x.codigo).toUpperCase() === e.codigo);
    // Control de código usado: solo un código PENDIENTE puede usarse, y una sola vez.
    if (!c || c.estado !== 'PENDIENTE') return [{ json: { resultado: 'INVALIDO' } }];
    if (new Date(c.expira_en) <= new Date()) return [{ json: { resultado: 'EXPIRADO', codigo_id: c.codigo_id, estado: 'EXPIRADO', usado_en: '' } }];
    const f = ahoraISO();
    return [{ json: {
      resultado: 'OK', codigo_id: c.codigo_id, estado: 'USADO', usado_en: f,
      vinculacion_id: genId('VIN'), usuario_id: c.usuario_id, chat_id: e.chat_id,
      telegram_username: e.telegram_username, fecha_vinculacion: f,
    } }];
  });
  wf.switch("Resultado de validación", [
    { salida: "OK", expr: "$json.resultado === 'OK'" },
    { salida: "EXPIRADO", expr: "$json.resultado === 'EXPIRADO'" },
  ], "INVALIDO");
  wf.actualizar("Marcar código USADO (EP03)", "EP03", "Codigos_Vinculacion", "codigo_id", ["estado", "usado_en"], { src: "Validar código y vigencia" });
  wf.agregarFila("Guardar chat_id / vinculación (EP03)", "EP03", "Vinculaciones", {
    vinculacion_id: "={{ $('Validar código y vigencia').first().json.vinculacion_id }}",
    usuario_id: "={{ $('Validar código y vigencia').first().json.usuario_id }}",
    chat_id: "={{ $('Validar código y vigencia').first().json.chat_id }}",
    telegram_username: "={{ $('Validar código y vigencia').first().json.telegram_username }}",
    fecha_vinculacion: "={{ $('Validar código y vigencia').first().json.fecha_vinculacion }}",
    estado: "ACTIVA",
  });
  tg("Confirmar vinculación", "✅ Tu cuenta EventPass quedó vinculada. Desde ahora recibirás aquí las confirmaciones, avisos de lista de espera y recordatorios.");
  wf.actualizar("Marcar código EXPIRADO (EP03)", "EP03", "Codigos_Vinculacion", "codigo_id", ["estado"], { src: "Validar código y vigencia" });
  tg("Avisar código expirado", "⌛ El código expiró. Genera uno nuevo en la web.");
  tg("Avisar código inválido", "❌ Código inválido o ya utilizado.");

  wf.chain("Telegram Trigger", "Extraer código recibido", "¿Es /vincular CODIGO?", "Buscar código (EP03)", "Validar código y vigencia", "Resultado de validación");
  wf.link("¿Es /vincular CODIGO?", "Responder instrucciones", 1);
  wf.link("Resultado de validación", "Marcar código USADO (EP03)", 0);
  wf.chain("Marcar código USADO (EP03)", "Guardar chat_id / vinculación (EP03)", "Confirmar vinculación");
  wf.link("Resultado de validación", "Marcar código EXPIRADO (EP03)", 1);
  wf.chain("Marcar código EXPIRADO (EP03)", "Avisar código expirado");
  wf.link("Resultado de validación", "Avisar código inválido", 2);
  return wf;
}

// ───────────────────────────── WF09 ─────────────────────────────
export function wf09(cfg) {
  const wf = new Workflow("WF09_notificaciones", cfg);
  wf.inicioSubworkflow();
  wf.code("Validar entrada", function () {
    const x = $input.first().json;
    const s = (v) => String(v ?? '').trim();
    const faltan = ['usuario_id', 'tipo', 'titulo', 'mensaje'].filter((k) => !s(x[k]));
    return [{ json: {
      valido: faltan.length === 0, faltan,
      usuario_id: s(x.usuario_id), tipo: s(x.tipo), titulo: s(x.titulo), mensaje: s(x.mensaje),
      evento_id: s(x.evento_id), inscripcion_id: s(x.inscripcion_id),
      clave_idempotencia: s(x.clave_idempotencia) || `${s(x.tipo)}|${s(x.inscripcion_id) || s(x.evento_id)}|${s(x.usuario_id)}`,
    } }];
  });
  wf.si("¿Entrada válida?", "$json.valido === true");
  wf.code("Salida: entrada inválida", function () {
    const e = $('Validar entrada').first().json;
    return [{ json: { notificacion_id: null, gmail_estado: 'NO_APLICA', telegram_estado: 'NO_APLICA', duplicada: false, error: `Faltan campos: ${e.faltan.join(', ')}`, usuario_id: e.usuario_id, evento_id: e.evento_id, inscripcion_id: e.inscripcion_id, clave_idempotencia: e.clave_idempotencia } }];
  });
  wf.leer("Leer notificaciones (EP09)", "EP09", "Notificaciones");
  wf.code("Buscar clave de idempotencia", function () {
    const e = $('Validar entrada').first().json;
    const previa = filas('Leer notificaciones (EP09)').find((r) => r.clave_idempotencia === e.clave_idempotencia && (r.gmail_estado === 'ENVIADO' || r.telegram_estado === 'ENVIADO'));
    return [{ json: { duplicada: !!previa, previa: previa || null } }];
  });
  wf.si("¿Notificación ya enviada?", "$json.duplicada === true");
  wf.code("Salida: duplicada (no se reenvía)", function () {
    const e = $('Validar entrada').first().json;
    const p = $('Buscar clave de idempotencia').first().json.previa;
    return [{ json: { notificacion_id: p.notificacion_id, gmail_estado: p.gmail_estado, telegram_estado: p.telegram_estado, duplicada: true, usuario_id: e.usuario_id, evento_id: e.evento_id, inscripcion_id: e.inscripcion_id, clave_idempotencia: e.clave_idempotencia } }];
  });
  wf.leer("Consultar usuario (EP01)", "EP01", "Usuarios");
  wf.leer("Consultar chat_id (EP03)", "EP03", "Vinculaciones");
  wf.code("Preparar destinatarios", function () {
    const e = $('Validar entrada').first().json;
    const u = filas('Consultar usuario (EP01)').find((x) => x.usuario_id === e.usuario_id);
    const v = filas('Consultar chat_id (EP03)').find((x) => x.usuario_id === e.usuario_id && x.estado === 'ACTIVA');
    const email = u ? String(u.email_normalizado || '') : '';
    const chat_id = v ? String(v.chat_id || '') : '';
    return [{ json: {
      notificacion_id: genId('NOT'), usuario_id: e.usuario_id, tipo: e.tipo, titulo: e.titulo, mensaje: e.mensaje,
      evento_id: e.evento_id, inscripcion_id: e.inscripcion_id, fecha: ahoraISO(),
      gmail_estado: email ? 'PENDIENTE' : 'NO_APLICA', telegram_estado: chat_id ? 'PENDIENTE' : 'NO_APLICA',
      gmail_error: '', telegram_error: '', clave_idempotencia: e.clave_idempotencia,
      email, chat_id, nombre: u ? u.nombre : '',
    } }];
  });
  wf.agregarFila("Registrar notificación (EP09)", "EP09", "Notificaciones", C.Notificaciones, { src: "Preparar destinatarios" });

  // Rama Gmail (independiente)
  const D = "$('Preparar destinatarios').first().json";
  wf.si("¿Tiene email?", `!!${D}.email`);
  wf.add("Enviar Gmail", "n8n-nodes-base.gmail", 2.1, {
    sendTo: `={{ ${D}.email }}`,
    subject: `=[EventPass Colegios] {{ ${D}.titulo }}`,
    emailType: "text",
    message: `=Hola {{ ${D}.nombre }},\n\n{{ ${D}.mensaje }}\n\n— EventPass Colegios`,
    options: { appendAttribution: false },
  }, { onError: "continueErrorOutput", ...wf.cred("gmail") });
  const canal = (name, campo, estado, conError) =>
    wf.code(name, new Function(`
      const d = $('Preparar destinatarios').first().json;
      ${conError ? "const e = $input.first().json.error; const msg = typeof e === 'string' ? e : ((e && e.message) || JSON.stringify(e) || 'Error desconocido');" : "const msg = '';"}
      return [{ json: { notificacion_id: d.notificacion_id, ${campo}_estado: '${estado}', ${campo}_error: String(msg).slice(0, 300) } }];
    `));
  canal("Gmail ENVIADO", "gmail", "ENVIADO", false);
  canal("Gmail ERROR", "gmail", "ERROR", true);
  canal("Gmail NO_APLICA", "gmail", "NO_APLICA", false);
  wf.actualizar("Registrar resultado Gmail (EP09)", "EP09", "Notificaciones", "notificacion_id", ["gmail_estado", "gmail_error"]);

  // Rama Telegram (independiente)
  wf.si("¿Tiene chat_id?", `!!${D}.chat_id`);
  wf.add("Enviar Telegram", "n8n-nodes-base.telegram", 1.2, {
    chatId: `={{ ${D}.chat_id }}`,
    text: `=🔔 {{ ${D}.titulo }}\n\n{{ ${D}.mensaje }}`,
    additionalFields: { appendAttribution: false },
  }, { onError: "continueErrorOutput", ...wf.cred("telegram") });
  canal("Telegram ENVIADO", "telegram", "ENVIADO", false);
  canal("Telegram ERROR", "telegram", "ERROR", true);
  canal("Telegram NO_APLICA", "telegram", "NO_APLICA", false);
  wf.actualizar("Registrar resultado Telegram (EP09)", "EP09", "Notificaciones", "notificacion_id", ["telegram_estado", "telegram_error"]);

  wf.add("Unir resultados de canales", "n8n-nodes-base.merge", 3, { mode: "combine", combineBy: "combineByPosition", options: {} });
  wf.code("Salida: resultado por canal", function () {
    // Cada canal ya registró su resultado por separado; aquí solo se arma la respuesta para quien llamó.
    const d = $('Preparar destinatarios').first().json;
    const de = (nodos) => { for (const n of nodos) if ($(n).isExecuted) return $(n).first().json; return {}; };
    const g = de(['Gmail ENVIADO', 'Gmail ERROR', 'Gmail NO_APLICA']);
    const t = de(['Telegram ENVIADO', 'Telegram ERROR', 'Telegram NO_APLICA']);
    return [{ json: { notificacion_id: d.notificacion_id, gmail_estado: g.gmail_estado, telegram_estado: t.telegram_estado, duplicada: false, usuario_id: d.usuario_id, evento_id: d.evento_id, inscripcion_id: d.inscripcion_id, clave_idempotencia: d.clave_idempotencia } }];
  });

  wf.chain("Inicio (Execute Sub-workflow)", "Validar entrada", "¿Entrada válida?", "Leer notificaciones (EP09)", "Buscar clave de idempotencia", "¿Notificación ya enviada?");
  wf.link("¿Entrada válida?", "Salida: entrada inválida", 1);
  wf.link("¿Notificación ya enviada?", "Salida: duplicada (no se reenvía)", 0);
  wf.link("¿Notificación ya enviada?", "Consultar usuario (EP01)", 1);
  wf.chain("Consultar usuario (EP01)", "Consultar chat_id (EP03)", "Preparar destinatarios", "Registrar notificación (EP09)");
  wf.link("Registrar notificación (EP09)", "¿Tiene email?");
  wf.link("Registrar notificación (EP09)", "¿Tiene chat_id?");

  wf.link("¿Tiene email?", "Enviar Gmail", 0);
  wf.link("¿Tiene email?", "Gmail NO_APLICA", 1);
  wf.link("Enviar Gmail", "Gmail ENVIADO", 0);
  wf.link("Enviar Gmail", "Gmail ERROR", 1);
  for (const n of ["Gmail ENVIADO", "Gmail ERROR", "Gmail NO_APLICA"]) {
    wf.link(n, "Registrar resultado Gmail (EP09)");
  }
  wf.link("Registrar resultado Gmail (EP09)", "Unir resultados de canales", 0, 0);
  wf.link("¿Tiene chat_id?", "Enviar Telegram", 0);
  wf.link("¿Tiene chat_id?", "Telegram NO_APLICA", 1);
  wf.link("Enviar Telegram", "Telegram ENVIADO", 0);
  wf.link("Enviar Telegram", "Telegram ERROR", 1);
  for (const n of ["Telegram ENVIADO", "Telegram ERROR", "Telegram NO_APLICA"]) {
    wf.link(n, "Registrar resultado Telegram (EP09)");
  }
  wf.link("Registrar resultado Telegram (EP09)", "Unir resultados de canales", 0, 1);
  wf.link("Unir resultados de canales", "Salida: resultado por canal");
  return wf;
}
