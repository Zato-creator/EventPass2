// WF06 (inscripciones CRUD), WF07 (reasignación de lista de espera) y WF08 (recordatorios).
/* global $, $input */
import { Workflow } from "./lib.mjs";
import { C } from "./columnas.mjs";
import { entradaWebhook, bloqueSesion, respAccionDesconocida } from "./comunes.mjs";

const NORM_JS = `
const norm = (i) => ({
  inscripcion_id: i.inscripcion_id, usuario_id: i.usuario_id, evento_id: i.evento_id, estado: i.estado,
  fecha_inscripcion: i.fecha_inscripcion, fecha_actualizacion: i.fecha_actualizacion,
  nombre_acreditacion: String(i.nombre_acreditacion ?? ''), observaciones: String(i.observaciones ?? ''),
  origen: i.origen || 'WEB', orden_espera: i.orden_espera === '' || i.orden_espera == null ? null : Number(i.orden_espera),
});
`;

// ───────────────────────────── WF06 ─────────────────────────────
export function wf06(cfg) {
  const wf = new Workflow("WF06_inscripciones_crud", cfg);
  const R = { reemplazos: { "/*NORM*/": NORM_JS } };
  const ultimo = entradaWebhook(wf, "ep/inscripciones");
  wf.responder();
  wf.agregarFila("Auditar (EP06)", "EP06", "Auditoria_Inscripciones", C.Auditoria_Inscripciones);
  const responderYAuditar = (n) => {
    wf.link(n, "Responder al cliente");
    wf.link(n, "Auditar (EP06)");
  };

  const valida = bloqueSesion(wf, ultimo);
  wf.leer("Leer usuario (EP01)", "EP01", "Usuarios");
  wf.leer("Leer vinculación Telegram (EP03)", "EP03", "Vinculaciones");
  wf.leer("Leer eventos (EP04)", "EP04", "Eventos");
  wf.leer("Leer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.switch("Enrutar por operación", ["crear", "listar", "actualizar", "cancelar"].map((a) => ({
    salida: a, expr: `$('Leer solicitud').first().json.accion === '${a}'`,
  })));
  wf.link(valida, "Leer usuario (EP01)", 0);
  wf.chain("Leer usuario (EP01)", "Leer vinculación Telegram (EP03)", "Leer eventos (EP04)", "Leer inscripciones (EP06)", "Enrutar por operación");
  wf.code("Resp: acción desconocida", respAccionDesconocida);
  wf.link("Enrutar por operación", "Resp: acción desconocida", 4);
  wf.link("Resp: acción desconocida", "Responder al cliente");

  // ── crear ──
  wf.code("Preparar validaciones", function () {
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const b = $('Leer solicitud').first().json.body;
    const u = filas('Leer usuario (EP01)').find((x) => x.usuario_id === uid);
    const vin = filas('Leer vinculación Telegram (EP03)').find((x) => x.usuario_id === uid && x.estado === 'ACTIVA');
    const evento_id = String(b.evento_id || '').trim();
    const e = filas('Leer eventos (EP04)').find((x) => x.evento_id === evento_id);
    const activas = filas('Leer inscripciones (EP06)').filter((i) => i.usuario_id === uid && i.evento_id === evento_id && ['CONFIRMADA', 'LISTA_ESPERA'].includes(i.estado));
    const nombre_acreditacion = (String(b.nombre_acreditacion ?? '').trim() || (u ? u.nombre : '')).slice(0, 120);
    return [{ json: {
      usuario_id: uid, evento_id, nombre_acreditacion, observaciones: String(b.observaciones ?? '').trim().slice(0, 300),
      datos_validos: !!evento_id && nombre_acreditacion.length >= 3,
      usuario_activo: !!u && u.estado === 'ACTIVO',
      telegram_vinculado: !!vin,
      evento_existe: !!e,
      evento_disponible: !!e && e.estado === 'PUBLICADO' && inicioEvento(e) > new Date(),
      duplicada: activas.length > 0,
      inscripcion_existente: activas.length ? activas[0].inscripcion_id : '',
      capacidad: e ? Number(e.capacidad) || 0 : 0,
      evento_nombre: e ? e.nombre : '', evento_fecha: e ? String(e.fecha).slice(0, 10) : '',
      evento_hora: e ? String(e.hora).slice(0, 5) : '', evento_lugar: e ? e.lugar : '',
    } }];
  });
  const checks = [
    ["¿Datos válidos?", "$json.datos_validos === true"],
    ["¿Usuario ACTIVO?", "$json.usuario_activo === true"],
    ["¿Telegram vinculado?", "$json.telegram_vinculado === true"],
    ["¿Evento existe?", "$json.evento_existe === true"],
    ["¿Evento PUBLICADO y disponible?", "$json.evento_disponible === true"],
    ["¿Sin inscripción activa? (idempotencia)", "$json.duplicada === false"],
  ];
  wf.code("Resp: inscripción rechazada", function () {
    const v = $('Preparar validaciones').first().json;
    let r;
    if (!v.datos_validos) r = [400, 'DATOS_INVALIDOS', 'Indica el evento y un nombre de acreditación (mínimo 3 caracteres).'];
    else if (!v.usuario_activo) r = [403, 'USUARIO_INACTIVO', 'Tu cuenta está inactiva.'];
    else if (!v.telegram_vinculado) r = [409, 'TELEGRAM_NO_VINCULADO', 'Debes vincular tu cuenta de Telegram antes de inscribirte.'];
    else if (!v.evento_existe) r = [404, 'EVENTO_NO_ENCONTRADO', 'El evento no existe.'];
    else if (!v.evento_disponible) r = [409, 'EVENTO_NO_DISPONIBLE', 'El evento no está disponible para inscripción (no publicado, cerrado, cancelado o ya pasó).'];
    else r = [409, 'INSCRIPCION_DUPLICADA', 'Ya tienes una inscripción activa en este evento.'];
    return [err(r[0], r[1], r[2], aud({
      inscripcion_id: v.inscripcion_existente, usuario_id: v.usuario_id, evento_id: v.evento_id,
      accion: r[1] === 'INSCRIPCION_DUPLICADA' ? 'RECHAZAR_DUPLICADO' : 'CREAR',
      estado_anterior: '', estado_nuevo: '', resultado: 'ERROR', detalle: r[1],
    }))];
  });
  wf.link("Enrutar por operación", "Preparar validaciones", 0);
  let prev = "Preparar validaciones";
  for (const [nombre, expr] of checks) {
    wf.si(nombre, expr);
    wf.link(prev, nombre, prev === "Preparar validaciones" ? 0 : 0);
    wf.link(nombre, "Resp: inscripción rechazada", 1);
    prev = nombre;
  }
  responderYAuditar("Resp: inscripción rechazada");

  // Releer justo antes de escribir (Sheets no tiene transacciones: reduce la ventana de carrera)
  wf.leer("Releer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.code("Calcular cupos y estado (CONFIRMADA / LISTA_ESPERA)", function () {
    const v = $('Preparar validaciones').first().json;
    const ins = filas('Releer inscripciones (EP06)').filter((i) => i.evento_id === v.evento_id);
    const dup = ins.find((i) => i.usuario_id === v.usuario_id && ['CONFIRMADA', 'LISTA_ESPERA'].includes(i.estado));
    const confirmadas = ins.filter((i) => i.estado === 'CONFIRMADA').length;
    const enEspera = ins.filter((i) => i.estado === 'LISTA_ESPERA').length;
    const cupos = Math.max(v.capacidad - confirmadas, 0); // cupos = capacidad − CONFIRMADAS
    const estado = cupos > 0 ? 'CONFIRMADA' : 'LISTA_ESPERA';
    const f = ahoraISO();
    return [{ json: {
      duplicada: !!dup, cupos_disponibles: cupos,
      inscripcion_id: genId('INS'), usuario_id: v.usuario_id, evento_id: v.evento_id, estado,
      fecha_inscripcion: f, fecha_actualizacion: f, nombre_acreditacion: v.nombre_acreditacion,
      observaciones: v.observaciones, origen: 'WEB', orden_espera: estado === 'LISTA_ESPERA' ? enEspera + 1 : '',
    } }];
  });
  wf.si("¿Duplicada al releer?", "$json.duplicada === true");
  wf.agregarFila("Crear inscripción (EP06)", "EP06", "Inscripciones", C.Inscripciones, { src: "Calcular cupos y estado (CONFIRMADA / LISTA_ESPERA)" });
  wf.code("Resp: inscripción creada", function () {
    /*NORM*/
    const i = $('Calcular cupos y estado (CONFIRMADA / LISTA_ESPERA)').first().json;
    const mensaje = i.estado === 'CONFIRMADA' ? 'Inscripción confirmada.' : `Quedaste en lista de espera (posición ${i.orden_espera}).`;
    return [ok(201, { inscripcion: norm(i), mensaje }, aud({
      inscripcion_id: i.inscripcion_id, usuario_id: i.usuario_id, evento_id: i.evento_id, accion: 'CREAR',
      estado_anterior: '', estado_nuevo: i.estado, resultado: 'OK', detalle: mensaje,
    }))];
  }, R);
  wf.code("Preparar notificación (inscripción)", function () {
    const i = $('Calcular cupos y estado (CONFIRMADA / LISTA_ESPERA)').first().json;
    const v = $('Preparar validaciones').first().json;
    const conf = i.estado === 'CONFIRMADA';
    const tipo = conf ? 'INSCRIPCION_CONFIRMADA' : 'LISTA_ESPERA';
    const mensaje = conf
      ? `Tu inscripción a "${v.evento_nombre}" está CONFIRMADA.\n📅 ${v.evento_fecha} a las ${v.evento_hora}\n📍 ${v.evento_lugar}\nAcreditación: ${i.nombre_acreditacion}`
      : `El evento "${v.evento_nombre}" está lleno. Quedaste en LISTA DE ESPERA (posición ${i.orden_espera}). Si se libera un cupo te avisaremos por correo y Telegram.`;
    return [{ json: {
      usuario_id: i.usuario_id, tipo, titulo: `${conf ? 'Inscripción confirmada' : 'Lista de espera'}: ${v.evento_nombre}`,
      mensaje, evento_id: i.evento_id, inscripcion_id: i.inscripcion_id, clave_idempotencia: `${tipo}|${i.inscripcion_id}`,
    } }];
  });
  wf.subworkflow("Notificar inscripción (WF09)", "WF09");
  wf.link(prev, "Releer inscripciones (EP06)", 0);
  wf.chain("Releer inscripciones (EP06)", "Calcular cupos y estado (CONFIRMADA / LISTA_ESPERA)", "¿Duplicada al releer?");
  wf.link("¿Duplicada al releer?", "Resp: inscripción rechazada", 0);
  wf.link("¿Duplicada al releer?", "Crear inscripción (EP06)", 1);
  wf.chain("Crear inscripción (EP06)", "Resp: inscripción creada");
  responderYAuditar("Resp: inscripción creada");
  wf.chain("Resp: inscripción creada", "Preparar notificación (inscripción)", "Notificar inscripción (WF09)");

  // ── listar ──
  wf.code("Resp: mis inscripciones", function () {
    /*NORM*/
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const eventos = filas('Leer eventos (EP04)');
    const lista = filas('Leer inscripciones (EP06)')
      .filter((i) => i.usuario_id === uid)
      .map((i) => {
        const e = eventos.find((x) => x.evento_id === i.evento_id) || {};
        return { ...norm(i), evento: { nombre: e.nombre || '(evento no disponible)', fecha: String(e.fecha || '').slice(0, 10), hora: String(e.hora || '').slice(0, 5), lugar: e.lugar || '', estado: e.estado || '' } };
      })
      .sort((a, b) => (a.evento.fecha + a.evento.hora).localeCompare(b.evento.fecha + b.evento.hora));
    return [ok(200, { inscripciones: lista })];
  }, R);
  wf.link("Enrutar por operación", "Resp: mis inscripciones", 1);
  wf.link("Resp: mis inscripciones", "Responder al cliente");

  // ── actualizar / cancelar (comparten validación de pertenencia) ──
  const validarPropia = (accion) => function () {
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const b = $('Leer solicitud').first().json.body;
    const id = String(b.inscripcion_id || '').trim();
    const i = filas('Leer inscripciones (EP06)').find((x) => x.inscripcion_id === id);
    let error = null;
    if (!id) error = [400, 'DATOS_INVALIDOS', 'Falta inscripcion_id.'];
    else if (!i || i.usuario_id !== uid) error = [404, 'INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe.'];
    else if (i.estado === 'CANCELADA') error = [409, 'INSCRIPCION_YA_CANCELADA', 'La inscripción ya está cancelada.'];
    const base = { valido: !error, error, inscripcion_id: id, usuario_id: uid, evento_id: i ? i.evento_id : '', estado_anterior: i ? i.estado : '', fila: i || null, fecha_actualizacion: ahoraISO() };
    if (error || '__ACCION__' === 'cancelar') return [{ json: { ...base, estado: 'CANCELADA' } }];
    const nombre = b.nombre_acreditacion !== undefined ? String(b.nombre_acreditacion).trim() : String(i.nombre_acreditacion ?? '');
    const obs = b.observaciones !== undefined ? String(b.observaciones).trim() : String(i.observaciones ?? '');
    if (nombre.length < 3) return [{ json: { ...base, valido: false, error: [400, 'DATOS_INVALIDOS', 'El nombre de acreditación debe tener al menos 3 caracteres.'] } }];
    return [{ json: { ...base, nombre_acreditacion: nombre.slice(0, 120), observaciones: obs.slice(0, 300) } }];
  };
  const rechazo = (accion) => function () {
    const v = $('Validar __NODO__').first().json;
    return [err(v.error[0], v.error[1], v.error[2], aud({
      inscripcion_id: v.inscripcion_id, usuario_id: v.usuario_id, evento_id: v.evento_id, accion: '__ACCION_AUD__',
      estado_anterior: v.estado_anterior, estado_nuevo: v.estado_anterior, resultado: 'ERROR', detalle: v.error[1],
    }))];
  };

  // actualizar
  wf.code("Validar actualización", validarPropia(), { reemplazos: { __ACCION__: "actualizar" } });
  wf.si("¿Actualización permitida?", "$json.valido === true");
  wf.actualizar("Actualizar inscripción (EP06)", "EP06", "Inscripciones", "inscripcion_id", ["nombre_acreditacion", "observaciones", "fecha_actualizacion"], { src: "Validar actualización" });
  wf.code("Resp: inscripción actualizada", function () {
    /*NORM*/
    const v = $('Validar actualización').first().json;
    const i = { ...v.fila, nombre_acreditacion: v.nombre_acreditacion, observaciones: v.observaciones, fecha_actualizacion: v.fecha_actualizacion };
    return [ok(200, { inscripcion: norm(i) }, aud({
      inscripcion_id: v.inscripcion_id, usuario_id: v.usuario_id, evento_id: v.evento_id, accion: 'ACTUALIZAR',
      estado_anterior: v.estado_anterior, estado_nuevo: v.estado_anterior, resultado: 'OK', detalle: 'Acreditación / observaciones actualizadas',
    }))];
  }, R);
  wf.code("Resp: actualización rechazada", rechazo(), { reemplazos: { __NODO__: "actualización", __ACCION_AUD__: "ACTUALIZAR" } });
  wf.link("Enrutar por operación", "Validar actualización", 2);
  wf.chain("Validar actualización", "¿Actualización permitida?", "Actualizar inscripción (EP06)", "Resp: inscripción actualizada");
  responderYAuditar("Resp: inscripción actualizada");
  wf.link("¿Actualización permitida?", "Resp: actualización rechazada", 1);
  responderYAuditar("Resp: actualización rechazada");

  // cancelar (borrado lógico → CANCELADA; el cupo lo reasigna WF07)
  wf.code("Validar cancelación", validarPropia(), { reemplazos: { __ACCION__: "cancelar" } });
  wf.si("¿Cancelación permitida?", "$json.valido === true");
  wf.actualizar("Cancelar inscripción (EP06)", "EP06", "Inscripciones", "inscripcion_id", ["estado", "fecha_actualizacion"], { src: "Validar cancelación" });
  wf.code("Resp: inscripción cancelada", function () {
    /*NORM*/
    const v = $('Validar cancelación').first().json;
    const i = { ...v.fila, estado: 'CANCELADA', fecha_actualizacion: v.fecha_actualizacion };
    return [ok(200, { inscripcion: norm(i) }, aud({
      inscripcion_id: v.inscripcion_id, usuario_id: v.usuario_id, evento_id: v.evento_id, accion: 'CANCELAR',
      estado_anterior: v.estado_anterior, estado_nuevo: 'CANCELADA', resultado: 'OK', detalle: 'Cancelada por el usuario',
    }))];
  }, R);
  wf.code("Resp: cancelación rechazada", rechazo(), { reemplazos: { __NODO__: "cancelación", __ACCION_AUD__: "CANCELAR" } });
  wf.code("Preparar notificación (cancelación)", function () {
    const v = $('Validar cancelación').first().json;
    const e = filas('Leer eventos (EP04)').find((x) => x.evento_id === v.evento_id) || {};
    return [{ json: {
      usuario_id: v.usuario_id, tipo: 'INSCRIPCION_CANCELADA', titulo: `Inscripción cancelada: ${e.nombre || v.evento_id}`,
      mensaje: `Cancelaste tu inscripción a "${e.nombre || v.evento_id}" (${String(e.fecha || '').slice(0, 10)} ${String(e.hora || '').slice(0, 5)}). Tu cupo quedó libre para la lista de espera.`,
      evento_id: v.evento_id, inscripcion_id: v.inscripcion_id, clave_idempotencia: `INSCRIPCION_CANCELADA|${v.inscripcion_id}`,
    } }];
  });
  wf.subworkflow("Notificar cancelación (WF09)", "WF09");
  wf.link("Enrutar por operación", "Validar cancelación", 3);
  wf.chain("Validar cancelación", "¿Cancelación permitida?", "Cancelar inscripción (EP06)", "Resp: inscripción cancelada");
  responderYAuditar("Resp: inscripción cancelada");
  wf.chain("Resp: inscripción cancelada", "Preparar notificación (cancelación)", "Notificar cancelación (WF09)");
  wf.link("¿Cancelación permitida?", "Resp: cancelación rechazada", 1);
  responderYAuditar("Resp: cancelación rechazada");
  return wf;
}

// ───────────────────────────── WF07 ─────────────────────────────
export function wf07(cfg) {
  const wf = new Workflow("WF07_reasignacion_lista_espera", cfg);
  wf.add("Cada 5 minutos", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } });
  wf.leer("Leer eventos (EP04)", "EP04", "Eventos");
  wf.filtro("Eventos PUBLICADOS futuros", "$json.estado === 'PUBLICADO' && new Date(String($json.fecha).slice(0,10) + 'T' + String($json.hora || '00:00').slice(0,5) + ':00-05:00') > new Date()");
  wf.leer("Leer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.agregar("Agrupar inscripciones", "inscripciones");
  wf.code("Calcular cupos libres y ordenar lista (fecha_inscripcion ASC)", function () {
    const eventos = $('Eventos PUBLICADOS futuros').all().map((i) => i.json).filter((e) => e.evento_id);
    const ins = ($input.first().json.inscripciones || []).filter((i) => i && i.inscripcion_id);
    const promover = [];
    for (const e of eventos) {
      const propias = ins.filter((i) => i.evento_id === e.evento_id);
      const confirmadas = propias.filter((i) => i.estado === 'CONFIRMADA').length;
      const libres = Math.max((Number(e.capacidad) || 0) - confirmadas, 0);
      if (!libres) continue;
      // Orden obligatorio: quien lleva más tiempo esperando tiene prioridad.
      const espera = propias
        .filter((i) => i.estado === 'LISTA_ESPERA')
        .sort((a, b) => new Date(a.fecha_inscripcion) - new Date(b.fecha_inscripcion));
      espera.slice(0, libres).forEach((i, idx) => promover.push({ json: {
        inscripcion_id: i.inscripcion_id, usuario_id: i.usuario_id, evento_id: e.evento_id,
        evento_nombre: e.nombre, evento_fecha: String(e.fecha).slice(0, 10), evento_hora: String(e.hora).slice(0, 5), evento_lugar: e.lugar,
        orden_lista: idx + 1, estado_anterior: 'LISTA_ESPERA', estado_nuevo: 'CONFIRMADA', estado: 'CONFIRMADA', fecha_actualizacion: ahoraISO(),
      } }));
    }
    return promover;
  });
  wf.actualizar("Promover inscripción a CONFIRMADA (EP06)", "EP06", "Inscripciones", "inscripcion_id", ["estado", "fecha_actualizacion"]);
  wf.code("Preparar notificación (reasignación)", function () {
    return $('Calcular cupos libres y ordenar lista (fecha_inscripcion ASC)').all().map(({ json: p }) => ({ json: {
      usuario_id: p.usuario_id, tipo: 'REASIGNACION', titulo: `¡Tienes cupo! ${p.evento_nombre}`,
      mensaje: `Se liberó un cupo y tu inscripción a "${p.evento_nombre}" pasó de LISTA DE ESPERA a CONFIRMADA.\n📅 ${p.evento_fecha} a las ${p.evento_hora}\n📍 ${p.evento_lugar}`,
      evento_id: p.evento_id, inscripcion_id: p.inscripcion_id, clave_idempotencia: `REASIGNACION|${p.inscripcion_id}`,
    } }));
  });
  wf.subworkflow("Notificar reasignación (WF09)", "WF09", { porItem: true });
  wf.code("Preparar registro de reasignación", function () {
    const resultados = $input.all().map((i) => i.json);
    return $('Calcular cupos libres y ordenar lista (fecha_inscripcion ASC)').all().map(({ json: p }) => {
      const r = resultados.find((x) => x.inscripcion_id === p.inscripcion_id) || {};
      const resultado_notificacion = `gmail:${r.gmail_estado || 'ERROR'}|telegram:${r.telegram_estado || 'ERROR'}`;
      return { json: {
        reasignacion_id: genId('REA'), evento_id: p.evento_id, inscripcion_id: p.inscripcion_id, usuario_id: p.usuario_id,
        fecha: ahoraISO(), orden_lista: p.orden_lista, estado_anterior: p.estado_anterior, estado_nuevo: p.estado_nuevo,
        resultado_notificacion,
        // auditoría en EP06
        auditoria_id: genId('AUD'), accion: 'PROMOVER', resultado: 'OK',
        detalle: `Promovida desde lista de espera (posición ${p.orden_lista}) · ${resultado_notificacion}`,
      } };
    });
  });
  wf.agregarFila("Registrar reasignación (EP07)", "EP07", "Reasignaciones", C.Reasignaciones);
  wf.agregarFila("Auditar promoción (EP06)", "EP06", "Auditoria_Inscripciones", C.Auditoria_Inscripciones);
  wf.chain("Cada 5 minutos", "Leer eventos (EP04)", "Eventos PUBLICADOS futuros", "Leer inscripciones (EP06)", "Agrupar inscripciones",
    "Calcular cupos libres y ordenar lista (fecha_inscripcion ASC)", "Promover inscripción a CONFIRMADA (EP06)", "Preparar notificación (reasignación)",
    "Notificar reasignación (WF09)", "Preparar registro de reasignación", "Registrar reasignación (EP07)");
  wf.link("Preparar registro de reasignación", "Auditar promoción (EP06)");
  return wf;
}

// ───────────────────────────── WF08 ─────────────────────────────
export function wf08(cfg) {
  const wf = new Workflow("WF08_recordatorios", cfg);
  wf.add("Cada 15 minutos", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "minutes", minutesInterval: 15 }] } });
  wf.leer("Leer eventos (EP04)", "EP04", "Eventos");
  wf.filtro("Eventos PUBLICADOS en las próximas 24 h", "$json.estado === 'PUBLICADO' && (new Date(String($json.fecha).slice(0,10) + 'T' + String($json.hora || '00:00').slice(0,5) + ':00-05:00') - new Date()) > 0 && (new Date(String($json.fecha).slice(0,10) + 'T' + String($json.hora || '00:00').slice(0,5) + ':00-05:00') - new Date()) <= 86400000");
  wf.leer("Leer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.leer("Leer recordatorios anteriores (EP08)", "EP08", "Recordatorios");
  wf.code("Calcular recordatorios pendientes (control de duplicado)", function () {
    const eventos = $('Eventos PUBLICADOS en las próximas 24 h').all().map((i) => i.json).filter((e) => e.evento_id);
    const confirmadas = filas('Leer inscripciones (EP06)').filter((i) => i.estado === 'CONFIRMADA');
    // Idempotencia: clave usuario_id|evento_id|tipo_recordatorio. Si ya existe, no se vuelve a enviar.
    const claves = new Set(filas('Leer recordatorios anteriores (EP08)').map((r) => r.clave_idempotencia));
    const ahora = new Date();
    const salida = [];
    for (const e of eventos) {
      const inicio = inicioEvento(e);
      const horas = (inicio - ahora) / 3600000;
      const tipos = horas <= 1 ? ['R24H', 'R1H'] : ['R24H'];
      for (const i of confirmadas.filter((x) => x.evento_id === e.evento_id)) {
        for (const tipo of tipos) {
          const clave = `${i.usuario_id}|${e.evento_id}|${tipo}`;
          if (claves.has(clave)) continue;
          claves.add(clave);
          salida.push({ json: {
            omitir: tipo === 'R24H' && horas <= 1, // ya pasó la ventana de 24 h: se registra OMITIDO y se envía solo R1H
            recordatorio_id: genId('REC'), usuario_id: i.usuario_id, evento_id: e.evento_id, inscripcion_id: i.inscripcion_id,
            tipo_recordatorio: tipo, fecha_programada: ahoraISO(new Date(inicio.getTime() - (tipo === 'R24H' ? 24 : 1) * 3600000)),
            clave_idempotencia: clave, evento_nombre: e.nombre, evento_fecha: String(e.fecha).slice(0, 10),
            evento_hora: String(e.hora).slice(0, 5), evento_lugar: e.lugar,
          } });
        }
      }
    }
    return salida;
  });
  wf.si("¿Omitir recordatorio?", "$json.omitir === true");
  wf.code("Preparar registro OMITIDO", function () {
    return $input.all().map(({ json: r }) => ({ json: { ...r, fecha_envio: '', estado: 'OMITIDO' } }));
  });
  wf.agregarFila("Registrar recordatorio omitido (EP08)", "EP08", "Recordatorios", C.Recordatorios);
  wf.code("Preparar notificación (recordatorio)", function () {
    return $input.all().map(({ json: r }) => ({ json: {
      usuario_id: r.usuario_id, tipo: 'RECORDATORIO',
      titulo: `Recordatorio: ${r.evento_nombre} ${r.tipo_recordatorio === 'R1H' ? 'empieza en menos de 1 hora' : 'es en menos de 24 horas'}`,
      mensaje: `⏰ Te recordamos tu evento "${r.evento_nombre}".\n📅 ${r.evento_fecha} a las ${r.evento_hora}\n📍 ${r.evento_lugar}\n¡Te esperamos!`,
      evento_id: r.evento_id, inscripcion_id: r.inscripcion_id,
      clave_idempotencia: `RECORDATORIO|${r.clave_idempotencia}`,
    } }));
  });
  wf.subworkflow("Enviar recordatorio (WF09)", "WF09", { porItem: true });
  wf.code("Preparar registro del recordatorio", function () {
    const resultados = $input.all().map((i) => i.json);
    return $('Calcular recordatorios pendientes (control de duplicado)').all()
      .map((i) => i.json)
      .filter((r) => !r.omitir)
      .map((r) => {
        const n = resultados.find((x) => x.clave_idempotencia === `RECORDATORIO|${r.clave_idempotencia}`) || {};
        const enviado = n.duplicada || n.gmail_estado === 'ENVIADO' || n.telegram_estado === 'ENVIADO';
        return { json: { ...r, fecha_envio: enviado ? ahoraISO() : '', estado: enviado ? 'ENVIADO' : 'ERROR' } };
      });
  });
  wf.agregarFila("Registrar recordatorio (EP08)", "EP08", "Recordatorios", C.Recordatorios);
  wf.chain("Cada 15 minutos", "Leer eventos (EP04)", "Eventos PUBLICADOS en las próximas 24 h", "Leer inscripciones (EP06)", "Leer recordatorios anteriores (EP08)",
    "Calcular recordatorios pendientes (control de duplicado)", "¿Omitir recordatorio?", "Preparar registro OMITIDO", "Registrar recordatorio omitido (EP08)");
  wf.link("¿Omitir recordatorio?", "Preparar notificación (recordatorio)", 1);
  wf.chain("Preparar notificación (recordatorio)", "Enviar recordatorio (WF09)", "Preparar registro del recordatorio", "Registrar recordatorio (EP08)");
  return wf;
}
