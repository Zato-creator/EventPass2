// WF11 (validar sesión), WF01 (usuarios CRUD) y WF02 (autenticación y sesiones).
/* global $, require, Buffer */
import { Workflow } from "./lib.mjs";
import { C } from "./columnas.mjs";
import { entradaWebhook, bloqueSesion, respAccionDesconocida } from "./comunes.mjs";

// ───────────────────────────── WF11 ─────────────────────────────
export function wf11(cfg) {
  const wf = new Workflow("WF11_validar_sesion", cfg);
  wf.inicioSubworkflow();
  wf.leer("Leer sesiones (EP02)", "EP02", "Sesiones");
  wf.leer("Leer usuarios (EP01)", "EP01", "Usuarios");
  wf.code("Evaluar sesión (existe, estado, expiración, usuario)", function () {
    // Una sesión NO es válida si: no existe, está CERRADA, está vencida o el usuario está INACTIVO.
    const token = String($('Inicio (Execute Sub-workflow)').first().json.session_token || '').trim();
    const ahora = new Date();
    const base = { valida: false, usuario_id: null, session_id: null, expira_en: null, motivo: 'NO_EXISTE', _actualizar: false };
    if (!token) return [{ json: base }];
    const s = filas('Leer sesiones (EP02)').find((x) => String(x.session_token) === token);
    if (!s) return [{ json: base }];
    const r = { ...base, session_id: s.session_id, expira_en: s.expira_en, estado: s.estado, ultima_validacion: ahoraISO(ahora) };
    if (s.estado === 'CERRADA') return [{ json: { ...r, motivo: 'CERRADA' } }];
    if (s.estado === 'EXPIRADA') return [{ json: { ...r, motivo: 'EXPIRADA' } }];
    if (new Date(s.expira_en) <= ahora) return [{ json: { ...r, motivo: 'EXPIRADA', estado: 'EXPIRADA', _actualizar: true } }];
    const u = filas('Leer usuarios (EP01)').find((x) => x.usuario_id === s.usuario_id);
    if (!u || u.estado !== 'ACTIVO') return [{ json: { ...r, motivo: 'USUARIO_INACTIVO' } }];
    return [{ json: { ...r, valida: true, usuario_id: s.usuario_id, motivo: null, _actualizar: true } }];
  });
  wf.si("¿Actualizar sesión?", "$json._actualizar === true");
  wf.actualizar("Actualizar estado / ultima_validacion (EP02)", "EP02", "Sesiones", "session_id", ["estado", "ultima_validacion"], {
    src: "Evaluar sesión (existe, estado, expiración, usuario)",
  });
  wf.code("Resultado de la validación", function () {
    const r = $('Evaluar sesión (existe, estado, expiración, usuario)').first().json;
    return [{ json: { valida: r.valida, usuario_id: r.usuario_id, session_id: r.session_id, expira_en: r.expira_en, motivo: r.motivo } }];
  });
  wf.chain("Inicio (Execute Sub-workflow)", "Leer sesiones (EP02)", "Leer usuarios (EP01)", "Evaluar sesión (existe, estado, expiración, usuario)", "¿Actualizar sesión?", "Actualizar estado / ultima_validacion (EP02)", "Resultado de la validación");
  wf.link("¿Actualizar sesión?", "Resultado de la validación", 1);
  return wf;
}

// ───────────────────────────── WF01 ─────────────────────────────
const PERFIL_JS = `
const perfil = (u, v, nombre) => ({
  usuario_id: u.usuario_id,
  nombre: nombre ?? u.nombre,
  email: u.email_normalizado,
  estado: u.estado,
  fecha_registro: u.fecha_registro,
  telegram_vinculado: !!v,
  telegram_username: v ? (v.telegram_username || null) : null,
});
const crypto = require('crypto');
const hashear = (pwd, salt) => crypto.pbkdf2Sync(String(pwd), String(salt), 100000, 64, 'sha512').toString('hex');
const verificar = (pwd, u) => {
  const calc = Buffer.from(hashear(pwd, u.password_salt), 'hex');
  const guardado = Buffer.from(String(u.password_hash || ''), 'hex');
  return guardado.length === calc.length && crypto.timingSafeEqual(guardado, calc);
};
const passwordValida = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\\d/.test(p);
`;

export function wf01(cfg) {
  const wf = new Workflow("WF01_usuarios_crud", cfg);
  const R = { reemplazos: { "/*PERFIL*/": PERFIL_JS } };
  const ultimo = entradaWebhook(wf, "ep/usuarios");
  wf.responder();
  wf.agregarFila("Auditar (EP01)", "EP01", "Auditoria_Usuarios", C.Auditoria_Usuarios);

  wf.switch("Enrutar por operación", [
    { salida: "registrar", expr: "$json.accion === 'registrar'" },
    { salida: "privada", expr: "['perfil','actualizar','desactivar'].includes($json.accion)" },
  ]);
  wf.link(ultimo, "Enrutar por operación");
  wf.code("Resp: acción desconocida", respAccionDesconocida);
  wf.link("Enrutar por operación", "Resp: acción desconocida", 2);
  wf.link("Resp: acción desconocida", "Responder al cliente");

  // Helper: un nodo de respuesta que también audita.
  const responderYAuditar = (nodo) => {
    wf.link(nodo, "Responder al cliente");
    wf.link(nodo, "Auditar (EP01)");
  };

  // ── registrar ──
  wf.code("Validar datos", function () {
    const b = $('Leer solicitud').first().json.body;
    const nombre = String(b.nombre || '').trim().replace(/\s+/g, ' ');
    const email = String(b.email || '').trim().toLowerCase().replace(/\s+/g, '');
    const password = String(b.password || '');
    const errores = [];
    if (nombre.length < 3 || nombre.length > 80) errores.push('El nombre debe tener entre 3 y 80 caracteres.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errores.push('El correo no es válido.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      errores.push('La contraseña debe tener al menos 8 caracteres, con letras y números.');
    return [{ json: { valido: errores.length === 0, errores, nombre, email, password } }];
  });
  wf.si("¿Datos válidos?", "$json.valido === true");
  wf.code("Resp: datos inválidos", function () {
    const d = $('Validar datos').first().json;
    return [err(400, 'DATOS_INVALIDOS', d.errores.join(' '), aud({ usuario_id: '', accion: 'REGISTRAR', resultado: 'ERROR', detalle: `Datos inválidos (${d.email})` }))];
  });
  wf.leer("Leer usuarios (EP01)", "EP01", "Usuarios");
  wf.code("Buscar email existente", function () {
    const d = $('Validar datos').first().json;
    const duplicado = filas('Leer usuarios (EP01)').some((u) => String(u.email_normalizado).toLowerCase() === d.email);
    return [{ json: { duplicado } }];
  });
  wf.si("¿Email duplicado?", "$json.duplicado === true");
  wf.code("Resp: email duplicado", function () {
    const d = $('Validar datos').first().json;
    return [err(409, 'EMAIL_DUPLICADO', 'Ya existe una cuenta con ese correo.', aud({ usuario_id: '', accion: 'REGISTRAR', resultado: 'ERROR', detalle: `Email duplicado (${d.email})` }))];
  });
  wf.code("Generar hash + salt", function () {
    // PBKDF2-SHA512, 100 000 iteraciones, salt aleatorio de 16 bytes. La contraseña nunca se guarda.
    const crypto = require('crypto');
    const d = $('Validar datos').first().json;
    const password_salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.pbkdf2Sync(d.password, password_salt, 100000, 64, 'sha512').toString('hex');
    return [{ json: { password_hash, password_salt } }];
  });
  wf.code("Generar usuario_id", function () {
    const d = $('Validar datos').first().json;
    const h = $('Generar hash + salt').first().json;
    const f = ahoraISO();
    return [{ json: {
      usuario_id: genId('USR'), nombre: d.nombre, email_normalizado: d.email,
      password_hash: h.password_hash, password_salt: h.password_salt,
      estado: 'ACTIVO', fecha_registro: f, fecha_actualizacion: f,
    } }];
  });
  wf.agregarFila("Crear usuario (EP01)", "EP01", "Usuarios", C.Usuarios, { src: "Generar usuario_id" });
  wf.code("Resp: usuario creado", function () {
    const u = $('Generar usuario_id').first().json;
    return [ok(201, { usuario_id: u.usuario_id, nombre: u.nombre, email: u.email_normalizado, estado: u.estado },
      aud({ usuario_id: u.usuario_id, accion: 'REGISTRAR', resultado: 'OK', detalle: 'Usuario registrado' }))];
  });

  wf.link("Enrutar por operación", "Validar datos", 0);
  wf.chain("Validar datos", "¿Datos válidos?", "Leer usuarios (EP01)", "Buscar email existente", "¿Email duplicado?");
  wf.link("¿Datos válidos?", "Resp: datos inválidos", 1);
  responderYAuditar("Resp: datos inválidos");
  wf.link("¿Email duplicado?", "Resp: email duplicado", 0);
  responderYAuditar("Resp: email duplicado");
  wf.link("¿Email duplicado?", "Generar hash + salt", 1);
  wf.chain("Generar hash + salt", "Generar usuario_id", "Crear usuario (EP01)", "Resp: usuario creado");
  responderYAuditar("Resp: usuario creado");

  // ── operaciones privadas ──
  const valida = bloqueSesion(wf, "Enrutar por operación", 1);

  wf.leer("Leer usuario (EP01)", "EP01", "Usuarios");
  wf.leer("Leer vinculación Telegram (EP03)", "EP03", "Vinculaciones");
  wf.switch("Enrutar operación privada", [
    { salida: "perfil", expr: "$('Leer solicitud').first().json.accion === 'perfil'" },
    { salida: "actualizar", expr: "$('Leer solicitud').first().json.accion === 'actualizar'" },
    { salida: "desactivar", expr: "$('Leer solicitud').first().json.accion === 'desactivar'" },
  ], null);
  wf.link(valida, "Leer usuario (EP01)", 0);
  wf.chain("Leer usuario (EP01)", "Leer vinculación Telegram (EP03)", "Enrutar operación privada");

  // perfil
  wf.code("Resp: perfil", function () {
    /*PERFIL*/
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const u = filas('Leer usuario (EP01)').find((x) => x.usuario_id === uid);
    if (!u) return [err(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')];
    const v = filas('Leer vinculación Telegram (EP03)').find((x) => x.usuario_id === uid && x.estado === 'ACTIVA');
    return [ok(200, perfil(u, v))];
  }, R);
  wf.link("Enrutar operación privada", "Resp: perfil", 0);
  wf.link("Resp: perfil", "Responder al cliente");

  // actualizar
  wf.code("Validar cambios (nombre / contraseña)", function () {
    /*PERFIL*/
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const b = $('Leer solicitud').first().json.body;
    const u = filas('Leer usuario (EP01)').find((x) => x.usuario_id === uid);
    const fallo = (status, code, message) => [{ json: { valido: false, status, code, message, usuario_id: uid } }];
    if (!u) return fallo(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.');
    let nombre = u.nombre;
    let password_hash = u.password_hash;
    let password_salt = u.password_salt;
    let cambios = 0;
    let cambioPassword = false;
    if (b.nombre !== undefined && String(b.nombre).trim() !== u.nombre) {
      nombre = String(b.nombre).trim().replace(/\s+/g, ' ');
      if (nombre.length < 3 || nombre.length > 80) return fallo(400, 'DATOS_INVALIDOS', 'El nombre debe tener entre 3 y 80 caracteres.');
      cambios++;
    }
    if (b.password_nueva) {
      if (!b.password_actual) return fallo(400, 'DATOS_INVALIDOS', 'Debes indicar tu contraseña actual.');
      if (!verificar(b.password_actual, u)) return fallo(401, 'CREDENCIALES_INVALIDAS', 'La contraseña actual no es correcta.');
      if (!passwordValida(String(b.password_nueva))) return fallo(400, 'DATOS_INVALIDOS', 'La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
      password_salt = crypto.randomBytes(16).toString('hex');
      password_hash = hashear(b.password_nueva, password_salt);
      cambios++;
      cambioPassword = true;
    }
    if (!cambios) return fallo(400, 'DATOS_INVALIDOS', 'No hay cambios para guardar.');
    return [{ json: { valido: true, usuario_id: uid, nombre, password_hash, password_salt, fecha_actualizacion: ahoraISO(), cambioPassword } }];
  }, R);
  wf.si("¿Cambios válidos?", "$json.valido === true");
  wf.actualizar("Actualizar usuario (EP01)", "EP01", "Usuarios", "usuario_id", ["nombre", "password_hash", "password_salt", "fecha_actualizacion"], { src: "Validar cambios (nombre / contraseña)" });
  wf.code("Resp: perfil actualizado", function () {
    /*PERFIL*/
    const c = $('Validar cambios (nombre / contraseña)').first().json;
    const u = filas('Leer usuario (EP01)').find((x) => x.usuario_id === c.usuario_id);
    const v = filas('Leer vinculación Telegram (EP03)').find((x) => x.usuario_id === c.usuario_id && x.estado === 'ACTIVA');
    return [ok(200, perfil(u, v, c.nombre), aud({ usuario_id: c.usuario_id, accion: c.cambioPassword ? 'CAMBIAR_PASSWORD' : 'ACTUALIZAR', resultado: 'OK', detalle: c.cambioPassword ? 'Perfil y contraseña actualizados' : 'Perfil actualizado' }))];
  }, R);
  wf.code("Resp: cambios rechazados", function () {
    const c = $('Validar cambios (nombre / contraseña)').first().json;
    return [err(c.status, c.code, c.message, aud({ usuario_id: c.usuario_id, accion: 'ACTUALIZAR', resultado: 'ERROR', detalle: c.code }))];
  });
  wf.link("Enrutar operación privada", "Validar cambios (nombre / contraseña)", 1);
  wf.chain("Validar cambios (nombre / contraseña)", "¿Cambios válidos?", "Actualizar usuario (EP01)", "Resp: perfil actualizado");
  responderYAuditar("Resp: perfil actualizado");
  wf.link("¿Cambios válidos?", "Resp: cambios rechazados", 1);
  responderYAuditar("Resp: cambios rechazados");

  // desactivar (borrado lógico)
  wf.code("Verificar contraseña (desactivar)", function () {
    /*PERFIL*/
    const uid = $('Validar sesión (WF11)').first().json.usuario_id;
    const b = $('Leer solicitud').first().json.body;
    const u = filas('Leer usuario (EP01)').find((x) => x.usuario_id === uid);
    if (!u) return [{ json: { valido: false, status: 404, code: 'USUARIO_NO_ENCONTRADO', message: 'El usuario no existe.', usuario_id: uid } }];
    if (!b.password || !verificar(b.password, u))
      return [{ json: { valido: false, status: 401, code: 'CREDENCIALES_INVALIDAS', message: 'La contraseña no es correcta.', usuario_id: uid } }];
    return [{ json: { valido: true, usuario_id: uid, estado: 'INACTIVO', fecha_actualizacion: ahoraISO() } }];
  }, R);
  wf.si("¿Contraseña correcta?", "$json.valido === true");
  wf.actualizar("Desactivar usuario (EP01)", "EP01", "Usuarios", "usuario_id", ["estado", "fecha_actualizacion"], { src: "Verificar contraseña (desactivar)" });
  wf.code("Resp: cuenta desactivada", function () {
    const c = $('Verificar contraseña (desactivar)').first().json;
    return [ok(200, { estado: 'INACTIVO' }, aud({ usuario_id: c.usuario_id, accion: 'DESACTIVAR', resultado: 'OK', detalle: 'Cuenta desactivada (borrado lógico)' }))];
  });
  wf.code("Resp: desactivación rechazada", function () {
    const c = $('Verificar contraseña (desactivar)').first().json;
    return [err(c.status, c.code, c.message, aud({ usuario_id: c.usuario_id, accion: 'DESACTIVAR', resultado: 'ERROR', detalle: c.code }))];
  });
  wf.leer("Leer sesiones (EP02)", "EP02", "Sesiones");
  wf.code("Sesiones ACTIVAS del usuario", function () {
    const uid = $('Verificar contraseña (desactivar)').first().json.usuario_id;
    const f = ahoraISO();
    return filas('Leer sesiones (EP02)')
      .filter((s) => s.usuario_id === uid && s.estado === 'ACTIVA')
      .map((s) => ({ json: { session_id: s.session_id, estado: 'CERRADA', cerrada_en: f } }));
  });
  wf.actualizar("Cerrar sesiones (EP02)", "EP02", "Sesiones", "session_id", ["estado", "cerrada_en"]);
  wf.link("Enrutar operación privada", "Verificar contraseña (desactivar)", 2);
  wf.chain("Verificar contraseña (desactivar)", "¿Contraseña correcta?", "Desactivar usuario (EP01)", "Resp: cuenta desactivada");
  responderYAuditar("Resp: cuenta desactivada");
  wf.chain("Resp: cuenta desactivada", "Leer sesiones (EP02)", "Sesiones ACTIVAS del usuario", "Cerrar sesiones (EP02)");
  wf.link("¿Contraseña correcta?", "Resp: desactivación rechazada", 1);
  responderYAuditar("Resp: desactivación rechazada");
  return wf;
}

// ───────────────────────────── WF02 ─────────────────────────────
export function wf02(cfg) {
  const wf = new Workflow("WF02_auth_sesiones", cfg);
  const ultimo = entradaWebhook(wf, "ep/auth");
  wf.responder();
  wf.switch("Enrutar por operación", [
    { salida: "login", expr: "$json.accion === 'login'" },
    { salida: "logout / validar", expr: "['logout','validar'].includes($json.accion)" },
  ]);
  wf.link(ultimo, "Enrutar por operación");
  wf.code("Resp: acción desconocida", respAccionDesconocida);
  wf.link("Enrutar por operación", "Resp: acción desconocida", 2);
  wf.link("Resp: acción desconocida", "Responder al cliente");

  // ── login ──
  wf.code("Validar datos (login)", function () {
    const b = $('Leer solicitud').first().json.body;
    const email = String(b.email || '').trim().toLowerCase().replace(/\s+/g, '');
    const password = String(b.password || '');
    return [{ json: { valido: !!email && !!password, email, password } }];
  });
  wf.si("¿Datos completos?", "$json.valido === true");
  wf.code("Resp: datos inválidos", function () {
    return [err(400, 'DATOS_INVALIDOS', 'Ingresa tu correo y tu contraseña.')];
  });
  wf.leer("Consultar usuario (EP01)", "EP01", "Usuarios");
  wf.code("Verificar password (hash + salt)", function () {
    const crypto = require('crypto');
    const d = $('Validar datos (login)').first().json;
    const u = filas('Consultar usuario (EP01)').find((x) => String(x.email_normalizado).toLowerCase() === d.email);
    // Se calcula el hash aunque el usuario no exista, para no revelar por tiempo de respuesta qué correos existen.
    const salt = u ? String(u.password_salt) : '00000000000000000000000000000000';
    const calc = crypto.pbkdf2Sync(d.password, salt, 100000, 64, 'sha512');
    const guardado = Buffer.from(u ? String(u.password_hash) : '', 'hex');
    const coincide = guardado.length === calc.length && crypto.timingSafeEqual(guardado, calc);
    let resultado = 'CREDENCIALES_INVALIDAS';
    if (u && coincide) resultado = u.estado === 'ACTIVO' ? 'OK' : 'USUARIO_INACTIVO';
    return [{ json: { resultado, usuario: resultado === 'OK' ? { usuario_id: u.usuario_id, nombre: u.nombre, email: u.email_normalizado } : null } }];
  });
  wf.switch("Resultado del login", [
    { salida: "OK", expr: "$json.resultado === 'OK'" },
    { salida: "USUARIO_INACTIVO", expr: "$json.resultado === 'USUARIO_INACTIVO'" },
  ], "CREDENCIALES_INVALIDAS");
  wf.code("Generar token de sesión", function () {
    const crypto = require('crypto');
    const u = $('Verificar password (hash + salt)').first().json.usuario;
    const ahora = new Date();
    return [{ json: {
      session_id: genId('SES'),
      usuario_id: u.usuario_id,
      session_token: crypto.randomBytes(32).toString('hex'),
      creada_en: ahoraISO(ahora),
      expira_en: ahoraISO(new Date(ahora.getTime() + 12 * 3600 * 1000)), // vigencia 12 h
      estado: 'ACTIVA',
      cerrada_en: '',
      ultima_validacion: ahoraISO(ahora),
    } }];
  });
  wf.agregarFila("Registrar sesión (EP02)", "EP02", "Sesiones", C.Sesiones, { src: "Generar token de sesión" });
  wf.code("Resp: sesión creada", function () {
    const s = $('Generar token de sesión').first().json;
    const u = $('Verificar password (hash + salt)').first().json.usuario;
    return [ok(201, { session_token: s.session_token, expira_en: s.expira_en, usuario: u })];
  });
  wf.code("Resp: usuario inactivo", function () {
    return [err(403, 'USUARIO_INACTIVO', 'Tu cuenta está inactiva.')];
  });
  wf.code("Resp: credenciales inválidas", function () {
    return [err(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')];
  });
  wf.link("Enrutar por operación", "Validar datos (login)", 0);
  wf.chain("Validar datos (login)", "¿Datos completos?", "Consultar usuario (EP01)", "Verificar password (hash + salt)", "Resultado del login");
  wf.link("¿Datos completos?", "Resp: datos inválidos", 1);
  wf.link("Resp: datos inválidos", "Responder al cliente");
  wf.link("Resultado del login", "Generar token de sesión", 0);
  wf.chain("Generar token de sesión", "Registrar sesión (EP02)", "Resp: sesión creada", "Responder al cliente");
  wf.link("Resultado del login", "Resp: usuario inactivo", 1);
  wf.link("Resp: usuario inactivo", "Responder al cliente");
  wf.link("Resultado del login", "Resp: credenciales inválidas", 2);
  wf.link("Resp: credenciales inválidas", "Responder al cliente");

  // ── logout / validar ──
  wf.subworkflow("Validar sesión (WF11)", "WF11");
  wf.si("¿Sesión válida?", "$json.valida === true");
  wf.code("Resp: sesión inválida", function () {
    const s = $('Validar sesión (WF11)').first().json;
    return s.motivo === 'USUARIO_INACTIVO'
      ? [err(403, 'USUARIO_INACTIVO', 'Tu cuenta está inactiva.')]
      : [err(401, 'SESION_INVALIDA', 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.')];
  });
  wf.switch("¿Logout o validar?", [
    { salida: "logout", expr: "$('Leer solicitud').first().json.accion === 'logout'" },
    { salida: "validar", expr: "$('Leer solicitud').first().json.accion === 'validar'" },
  ], null);
  wf.code("Preparar cierre de sesión", function () {
    const s = $('Validar sesión (WF11)').first().json;
    return [{ json: { session_id: s.session_id, estado: 'CERRADA', cerrada_en: ahoraISO() } }];
  });
  wf.actualizar("Cerrar sesión (EP02)", "EP02", "Sesiones", "session_id", ["estado", "cerrada_en"], { src: "Preparar cierre de sesión" });
  wf.code("Resp: sesión cerrada", function () {
    return [ok(200, { cerrada: true })];
  });
  wf.code("Resp: sesión válida", function () {
    const s = $('Validar sesión (WF11)').first().json;
    return [ok(200, { valida: true, usuario_id: s.usuario_id, expira_en: s.expira_en })];
  });
  wf.link("Enrutar por operación", "Validar sesión (WF11)", 1);
  wf.chain("Validar sesión (WF11)", "¿Sesión válida?", "¿Logout o validar?");
  wf.link("¿Sesión válida?", "Resp: sesión inválida", 1);
  wf.link("Resp: sesión inválida", "Responder al cliente");
  wf.chain("¿Logout o validar?", "Preparar cierre de sesión", "Cerrar sesión (EP02)", "Resp: sesión cerrada", "Responder al cliente");
  wf.link("¿Logout o validar?", "Resp: sesión válida", 1);
  wf.link("Resp: sesión válida", "Responder al cliente");
  return wf;
}
