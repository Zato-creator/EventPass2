// WF04 (administración CRUD de eventos, Form Trigger) y WF05 (catálogo público).
/* global $ */
import { Workflow } from "./lib.mjs";
import { C } from "./columnas.mjs";

const CATEGORIAS = ["Académico", "Deportes", "Cultura", "Tecnología", "Comunidad"];

// ───────────────────────────── WF04 ─────────────────────────────
export function wf04(cfg) {
  const wf = new Workflow("WF04_eventos_crud", cfg);
  const opciones = (lista) => ({ values: lista.map((option) => ({ option })) });

  wf.add("Formulario administrador", "n8n-nodes-base.formTrigger", 2.2, {
    authentication: "basicAuth",
    formTitle: "EventPass Colegios · Administración de eventos",
    formDescription:
      "Solo administrador. CREATE: completa todos los campos. READ / PUBLICAR / CERRAR / CANCELAR: solo el ID. UPDATE: el ID y los campos a cambiar (los vacíos no se modifican).",
    formFields: {
      values: [
        { fieldLabel: "Acción", fieldType: "dropdown", fieldOptions: opciones(["CREATE", "READ", "UPDATE", "PUBLICAR", "CERRAR", "CANCELAR"]), requiredField: true },
        { fieldLabel: "ID del evento", placeholder: "EVT-20261005203000-AB12 (no aplica para CREATE)" },
        { fieldLabel: "Nombre" },
        { fieldLabel: "Categoría", fieldType: "dropdown", fieldOptions: opciones(["—", ...CATEGORIAS]) },
        { fieldLabel: "Descripción", fieldType: "textarea" },
        { fieldLabel: "Fecha", fieldType: "date" },
        { fieldLabel: "Hora (HH:mm)", placeholder: "08:00" },
        { fieldLabel: "Lugar" },
        { fieldLabel: "Capacidad", fieldType: "number" },
        { fieldLabel: "URL de imagen", placeholder: "https://images.unsplash.com/..." },
        { fieldLabel: "Organizador" },
        { fieldLabel: "Estado inicial (solo CREATE)", fieldType: "dropdown", fieldOptions: opciones(["BORRADOR", "PUBLICADO"]) },
      ],
    },
    responseMode: "lastNode",
    options: {},
  }, { webhookId: "5f1e2d3c-4b5a-4c6d-8e7f-90a1b2c3d4e5", ...wf.cred("basicAuth") });

  wf.code("Validar formulario", function () {
    const f = $('Formulario administrador').first().json;
    const v = (k) => (f[k] === undefined || f[k] === null || f[k] === '—' ? '' : String(f[k]).trim());
    const accion = v('Acción');
    const d = {
      evento_id: v('ID del evento').toUpperCase(), nombre: v('Nombre'), categoria: v('Categoría'),
      descripcion: v('Descripción'), fecha: v('Fecha').slice(0, 10), hora: v('Hora (HH:mm)'), lugar: v('Lugar'),
      capacidad: v('Capacidad'), imagen_url: v('URL de imagen'), organizador: v('Organizador'),
      estado_inicial: v('Estado inicial (solo CREATE)') || 'BORRADOR',
    };
    const CATS = ['Académico', 'Deportes', 'Cultura', 'Tecnología', 'Comunidad'];
    const errores = [];
    if (accion === 'CREATE') {
      for (const k of ['nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'organizador'])
        if (!d[k]) errores.push(`Falta el campo "${k}".`);
    } else if (!d.evento_id) errores.push('Indica el ID del evento.');
    if (d.nombre && (d.nombre.length < 3 || d.nombre.length > 120)) errores.push('El nombre debe tener entre 3 y 120 caracteres.');
    if (d.categoria && !CATS.includes(d.categoria)) errores.push('Categoría no válida.');
    if (d.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) errores.push('La fecha debe tener formato AAAA-MM-DD.');
    if (d.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.hora)) errores.push('La hora debe tener formato HH:mm (24 h).');
    if (d.capacidad && !(Number.isInteger(Number(d.capacidad)) && Number(d.capacidad) > 0)) errores.push('La capacidad debe ser un entero mayor que 0.');
    if (d.imagen_url && !/^https?:\/\//i.test(d.imagen_url)) errores.push('La URL de imagen debe empezar por http(s)://');
    return [{ json: { accion, ...d, valido: errores.length === 0, errores } }];
  });
  wf.si("¿Formulario válido?", "$json.valido === true");
  wf.switch("Enrutar por acción", [{ salida: "CREATE", expr: "$json.accion === 'CREATE'" }], "READ / UPDATE / estado");

  wf.add("Mostrar resultado", "n8n-nodes-base.form", 1, {
    operation: "completion",
    completionTitle: "={{ $json._titulo }}",
    completionMessage: "={{ $json._mensaje }}",
    options: {},
  });
  wf.agregarFila("Auditar (EP04)", "EP04", "Auditoria_Eventos", C.Auditoria_Eventos);
  const terminar = (n) => {
    wf.link(n, "Auditar (EP04)");
    wf.link(n, "Mostrar resultado");
  };

  wf.code("Resultado: formulario inválido", function () {
    const d = $('Validar formulario').first().json;
    return [{ json: { _titulo: '❌ Formulario inválido', _mensaje: d.errores.join(' '), ...aud({ evento_id: d.evento_id, accion: d.accion || 'CREATE', resultado: 'ERROR', detalle: d.errores.join(' ') }) } }];
  });

  // CREATE
  wf.code("Generar evento_id", function () {
    const d = $('Validar formulario').first().json;
    const f = ahoraISO();
    return [{ json: {
      evento_id: genId('EVT'), nombre: d.nombre, categoria: d.categoria, descripcion: d.descripcion,
      fecha: d.fecha, hora: d.hora, lugar: d.lugar, capacidad: Number(d.capacidad), imagen_url: d.imagen_url,
      organizador: d.organizador, estado: d.estado_inicial, fecha_creacion: f, fecha_actualizacion: f,
    } }];
  });
  wf.agregarFila("Crear evento (EP04)", "EP04", "Eventos", C.Eventos, { src: "Generar evento_id" });
  wf.code("Resultado: evento creado", function () {
    const e = $('Generar evento_id').first().json;
    return [{ json: { _titulo: '✅ Evento creado', _mensaje: `ID: ${e.evento_id} · ${e.nombre} · Estado: ${e.estado}`, ...aud({ evento_id: e.evento_id, accion: 'CREATE', resultado: 'OK', detalle: `${e.nombre} (${e.estado})` }) } }];
  });

  // READ / UPDATE / PUBLICAR / CERRAR / CANCELAR
  wf.leer("Buscar evento por ID (EP04)", "EP04", "Eventos", {
    columna: "evento_id",
    valor: "={{ $('Validar formulario').first().json.evento_id }}",
  });
  wf.code("Aplicar acción y manejo de estados", function () {
    const d = $('Validar formulario').first().json;
    const e = filas('Buscar evento por ID (EP04)').find((x) => String(x.evento_id).toUpperCase() === d.evento_id);
    if (!e) return [{ json: { resultado: 'ERROR', mensaje: `No existe el evento ${d.evento_id}.` } }];
    if (d.accion === 'READ') return [{ json: { resultado: 'READ', evento: e } }];
    // Transiciones permitidas (borrado lógico: nunca se elimina la fila)
    const T = {
      PUBLICAR: { desde: ['BORRADOR'], a: 'PUBLICADO' },
      CERRAR: { desde: ['PUBLICADO'], a: 'CERRADO' },
      CANCELAR: { desde: ['BORRADOR', 'PUBLICADO', 'CERRADO'], a: 'CANCELADO' },
    };
    const nuevo = { ...e };
    delete nuevo.row_number;
    if (d.accion === 'UPDATE') {
      if (e.estado === 'CANCELADO') return [{ json: { resultado: 'ERROR', mensaje: 'Un evento CANCELADO no se puede editar.' } }];
      let cambios = 0;
      for (const k of ['nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'imagen_url', 'organizador'])
        if (d[k] !== '') { nuevo[k] = k === 'capacidad' ? Number(d[k]) : d[k]; cambios++; }
      if (!cambios) return [{ json: { resultado: 'ERROR', mensaje: 'No indicaste ningún campo para actualizar.' } }];
    } else {
      const t = T[d.accion];
      if (!t || !t.desde.includes(e.estado)) return [{ json: { resultado: 'ERROR', mensaje: `No se puede aplicar ${d.accion} a un evento en estado ${e.estado}.` } }];
      nuevo.estado = t.a;
    }
    nuevo.fecha_actualizacion = ahoraISO();
    return [{ json: { resultado: 'ACTUALIZAR', estado_anterior: e.estado, evento: nuevo } }];
  });
  wf.switch("¿Resultado de la acción?", [
    { salida: "READ", expr: "$json.resultado === 'READ'" },
    { salida: "ACTUALIZAR", expr: "$json.resultado === 'ACTUALIZAR'" },
  ], "ERROR");
  wf.code("Resultado: detalle del evento", function () {
    const e = $('Aplicar acción y manejo de estados').first().json.evento;
    const m = `${e.evento_id} · ${e.nombre} · ${e.categoria} · ${e.fecha} ${e.hora} · ${e.lugar} · Capacidad ${e.capacidad} · Organiza ${e.organizador} · Estado ${e.estado}`;
    return [{ json: { _titulo: '📄 Detalle del evento', _mensaje: m, ...aud({ evento_id: e.evento_id, accion: 'READ', resultado: 'OK', detalle: 'Consulta desde el formulario' }) } }];
  });
  const EV = "$('Aplicar acción y manejo de estados').first().json.evento";
  const colsEvento = {};
  for (const c of C.Eventos.filter((c) => c !== "fecha_creacion")) colsEvento[c] = `={{ ${EV}.${c} }}`;
  wf.actualizar("Actualizar evento (EP04)", "EP04", "Eventos", "evento_id", colsEvento);
  wf.code("Resultado: evento actualizado", function () {
    const r = $('Aplicar acción y manejo de estados').first().json;
    const d = $('Validar formulario').first().json;
    const e = r.evento;
    return [{ json: { _titulo: '✅ Evento actualizado', _mensaje: `${e.evento_id} · ${e.nombre} · Estado: ${r.estado_anterior} → ${e.estado}`, ...aud({ evento_id: e.evento_id, accion: d.accion, resultado: 'OK', detalle: `${r.estado_anterior} → ${e.estado}` }) } }];
  });
  wf.code("Resultado: acción rechazada", function () {
    const d = $('Validar formulario').first().json;
    const r = $('Aplicar acción y manejo de estados').first().json;
    return [{ json: { _titulo: '❌ No se pudo completar', _mensaje: r.mensaje, ...aud({ evento_id: d.evento_id, accion: d.accion, resultado: 'ERROR', detalle: r.mensaje }) } }];
  });

  // Si se cancela un evento: avisar a los inscritos activos (vía WF09)
  wf.si("¿Se canceló el evento?", `${EV}.estado === 'CANCELADO'`);
  wf.leer("Leer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.code("Inscritos activos a notificar", function () {
    const e = $('Aplicar acción y manejo de estados').first().json.evento;
    return filas('Leer inscripciones (EP06)')
      .filter((i) => i.evento_id === e.evento_id && ['CONFIRMADA', 'LISTA_ESPERA'].includes(i.estado))
      .map((i) => ({ json: {
        usuario_id: i.usuario_id, tipo: 'EVENTO_CANCELADO', titulo: `Evento cancelado: ${e.nombre}`,
        mensaje: `Lamentamos informarte que el evento "${e.nombre}" programado para el ${e.fecha} a las ${e.hora} fue CANCELADO por la institución.`,
        evento_id: e.evento_id, inscripcion_id: i.inscripcion_id, clave_idempotencia: `EVENTO_CANCELADO|${i.inscripcion_id}`,
      } }));
  });
  wf.subworkflow("Notificar cancelación (WF09)", "WF09", { porItem: true });

  wf.chain("Formulario administrador", "Validar formulario", "¿Formulario válido?", "Enrutar por acción", "Generar evento_id", "Crear evento (EP04)", "Resultado: evento creado");
  wf.link("¿Formulario válido?", "Resultado: formulario inválido", 1);
  wf.link("Enrutar por acción", "Buscar evento por ID (EP04)", 1);
  wf.chain("Buscar evento por ID (EP04)", "Aplicar acción y manejo de estados", "¿Resultado de la acción?", "Resultado: detalle del evento");
  wf.link("¿Resultado de la acción?", "Actualizar evento (EP04)", 1);
  wf.chain("Actualizar evento (EP04)", "Resultado: evento actualizado");
  wf.link("¿Resultado de la acción?", "Resultado: acción rechazada", 2);
  wf.link("Actualizar evento (EP04)", "¿Se canceló el evento?");
  wf.chain("¿Se canceló el evento?", "Leer inscripciones (EP06)", "Inscritos activos a notificar", "Notificar cancelación (WF09)");
  for (const n of ["Resultado: formulario inválido", "Resultado: evento creado", "Resultado: detalle del evento", "Resultado: evento actualizado", "Resultado: acción rechazada"]) terminar(n);
  return wf;
}

// ───────────────────────────── WF05 ─────────────────────────────
export function wf05(cfg) {
  const wf = new Workflow("WF05_catalogo_publico", cfg);
  wf.webhook("Webhook", "ep/catalogo", "GET");
  wf.code("Leer parámetros", function () {
    const q = $('Webhook').first().json.query || {};
    const s = (x) => String(x ?? '').trim();
    const evento_id = s(q.evento_id);
    const categoria = s(q.categoria);
    const tipo = s(q.categorias) === '1' ? 'CATEGORIAS' : evento_id ? 'DETALLE' : categoria ? 'FILTRO' : 'LISTADO';
    return [{ json: { visitor_id: s(q.visitor_id) || 'anonimo', evento_id, categoria, tipo } }];
  });
  wf.leer("Leer eventos (EP04)", "EP04", "Eventos");
  wf.filtro("Solo eventos publicables", "['PUBLICADO','CERRADO','CANCELADO'].includes($json.estado)");
  wf.leer("Leer inscripciones (EP06)", "EP06", "Inscripciones");
  wf.filtro("Inscripciones activas", "['CONFIRMADA','LISTA_ESPERA'].includes($json.estado)");
  wf.agregar("Agrupar inscripciones", "inscripciones");
  wf.code("Calcular cupos (capacidad − CONFIRMADAS)", function () {
    const p = $('Leer parámetros').first().json;
    const CATS = ['Académico', 'Deportes', 'Cultura', 'Tecnología', 'Comunidad'];
    const eventos = $('Solo eventos publicables').all().map((i) => i.json).filter((e) => e.evento_id);
    const ins = ($input.first().json.inscripciones || []).filter((i) => i && i.evento_id);
    const ahora = new Date();
    const publicos = eventos.map((e) => {
      const propias = ins.filter((i) => i.evento_id === e.evento_id);
      const confirmadas = propias.filter((i) => i.estado === 'CONFIRMADA').length;
      const espera = propias.filter((i) => i.estado === 'LISTA_ESPERA').length;
      const capacidad = Number(e.capacidad) || 0;
      const cupos = Math.max(capacidad - confirmadas, 0);
      const pasado = inicioEvento(e) <= ahora;
      const disponibilidad = e.estado === 'CANCELADO' ? 'CANCELADO' : e.estado === 'CERRADO' || pasado ? 'CERRADO' : cupos > 0 ? 'DISPONIBLE' : 'LLENO';
      return {
        evento_id: e.evento_id, nombre: e.nombre, categoria: e.categoria, descripcion: e.descripcion || '',
        fecha: String(e.fecha).slice(0, 10), hora: String(e.hora).slice(0, 5), lugar: e.lugar, capacidad,
        inscritos_confirmados: confirmadas, cupos_disponibles: cupos, en_lista_espera: espera,
        imagen_url: e.imagen_url || '', organizador: e.organizador || '', estado: e.estado, disponibilidad,
      };
    }).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

    const log = (status, count) => ({
      _registrar: true, consulta_id: genId('CON'), fecha: ahoraISO(), tipo: p.tipo, evento_id: p.evento_id,
      categoria: p.categoria, resultado_count: count, visitor_id: p.visitor_id, status_http: status,
    });
    if (p.tipo === 'CATEGORIAS') return [ok(200, { categorias: CATS }, { _registrar: false })];
    if (p.tipo === 'DETALLE') {
      const e = publicos.find((x) => x.evento_id === p.evento_id);
      return e
        ? [ok(200, { tipo: 'DETALLE', evento: e }, log(200, 1))]
        : [err(404, 'EVENTO_NO_ENCONTRADO', 'El evento no existe o no está publicado.', log(404, 0))];
    }
    if (p.tipo === 'FILTRO' && !CATS.includes(p.categoria))
      return [err(400, 'DATOS_INVALIDOS', 'Categoría no válida.', log(400, 0))];
    const lista = p.tipo === 'FILTRO' ? publicos.filter((e) => e.categoria === p.categoria) : publicos;
    return [ok(200, { tipo: p.tipo, total: lista.length, eventos: lista }, log(200, lista.length))];
  });
  wf.responder("Responder JSON");
  wf.si("¿Registrar consulta?", "$json._registrar === true");
  wf.agregarFila("Registrar consulta (EP05)", "EP05", "Consultas_Catalogo", C.Consultas_Catalogo);

  wf.chain("Webhook", "Leer parámetros", "Leer eventos (EP04)", "Solo eventos publicables", "Leer inscripciones (EP06)", "Inscripciones activas", "Agrupar inscripciones", "Calcular cupos (capacidad − CONFIRMADAS)", "Responder JSON");
  wf.link("Calcular cupos (capacidad − CONFIRMADAS)", "¿Registrar consulta?");
  wf.link("¿Registrar consulta?", "Registrar consulta (EP05)", 0);
  return wf;
}
