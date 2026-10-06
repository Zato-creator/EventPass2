// Piezas que se repiten en varios workflows con webhook.
/* global $ */

export function leerSolicitud() {
  const req = $('Webhook').first().json;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const auth = String((req.headers || {}).authorization || '');
  const session_token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return [{ json: { accion: String(body.accion || '').trim(), body, session_token } }];
}

export function respSesionInvalida() {
  const s = $('Validar sesión (WF11)').first().json;
  return s.motivo === 'USUARIO_INACTIVO'
    ? [err(403, 'USUARIO_INACTIVO', 'Tu cuenta está inactiva.')]
    : [err(401, 'SESION_INVALIDA', 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.')];
}

export function respAccionDesconocida() {
  const a = $('Leer solicitud').first().json.accion;
  return [err(400, 'ACCION_DESCONOCIDA', `Acción no soportada: "${a}".`)];
}

// Webhook → Leer solicitud. Devuelve el nombre del último nodo.
export function entradaWebhook(wf, path, method = 'POST') {
  wf.webhook('Webhook', path, method);
  wf.code('Leer solicitud', leerSolicitud);
  return wf.chain('Webhook', 'Leer solicitud');
}

// Validar sesión (WF11) → ¿Sesión válida?  (salida 0 = válida). La rama inválida responde 401/403.
export function bloqueSesion(wf, desde, salida = 0) {
  wf.subworkflow('Validar sesión (WF11)', 'WF11');
  wf.si('¿Sesión válida?', '$json.valida === true');
  wf.code('Resp: sesión inválida', respSesionInvalida);
  wf.link(desde, 'Validar sesión (WF11)', salida);
  wf.link('Validar sesión (WF11)', '¿Sesión válida?');
  wf.link('¿Sesión válida?', 'Resp: sesión inválida', 1);
  wf.link('Resp: sesión inválida', 'Responder al cliente');
  return '¿Sesión válida?';
}
