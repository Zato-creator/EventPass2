/**
 * EventPass Colegios — crea los 10 Google Sheets (EP01…EP10) con sus hojas y encabezados.
 *
 * Uso (una sola vez):
 *   1. Abre https://script.google.com → "Nuevo proyecto".
 *   2. Borra el contenido, pega este archivo completo y guarda.
 *   3. Selecciona la función `crearSheetsEventPass` y pulsa "Ejecutar". Autoriza los permisos.
 *   4. Abre "Registro de ejecución": copia el bloque JSON "sheets" que imprime y pégalo en
 *      scripts/n8n/config.local.json (clave "sheets").
 *
 * Es idempotente: si la carpeta o un archivo ya existen, los reutiliza y solo agrega hojas faltantes.
 * Fuente de los encabezados: docs/MODELO_DATOS.md.
 */

const CARPETA = 'EventPass_Colegios';

const ESTRUCTURA = {
  EP01_Usuarios: {
    Usuarios: ['usuario_id', 'nombre', 'email_normalizado', 'password_hash', 'password_salt', 'estado', 'fecha_registro', 'fecha_actualizacion'],
    Auditoria_Usuarios: ['auditoria_id', 'usuario_id', 'accion', 'fecha', 'resultado', 'detalle'],
  },
  EP02_Sesiones: {
    Sesiones: ['session_id', 'usuario_id', 'session_token', 'creada_en', 'expira_en', 'estado', 'cerrada_en', 'ultima_validacion'],
  },
  EP03_Telegram: {
    Codigos_Vinculacion: ['codigo_id', 'usuario_id', 'codigo', 'creado_en', 'expira_en', 'estado', 'usado_en'],
    Vinculaciones: ['vinculacion_id', 'usuario_id', 'chat_id', 'telegram_username', 'fecha_vinculacion', 'estado'],
  },
  EP04_Eventos: {
    Eventos: ['evento_id', 'nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'imagen_url', 'organizador', 'estado', 'fecha_creacion', 'fecha_actualizacion'],
    Auditoria_Eventos: ['auditoria_id', 'evento_id', 'accion', 'fecha', 'resultado', 'detalle'],
  },
  EP05_Catalogo_Log: {
    Consultas_Catalogo: ['consulta_id', 'fecha', 'tipo', 'evento_id', 'categoria', 'resultado_count', 'visitor_id', 'status_http'],
  },
  EP06_Inscripciones: {
    Inscripciones: ['inscripcion_id', 'usuario_id', 'evento_id', 'estado', 'fecha_inscripcion', 'fecha_actualizacion', 'nombre_acreditacion', 'observaciones', 'origen', 'orden_espera'],
    Auditoria_Inscripciones: ['auditoria_id', 'inscripcion_id', 'usuario_id', 'evento_id', 'accion', 'estado_anterior', 'estado_nuevo', 'fecha', 'resultado', 'detalle'],
  },
  EP07_Reasignaciones: {
    Reasignaciones: ['reasignacion_id', 'evento_id', 'inscripcion_id', 'usuario_id', 'fecha', 'orden_lista', 'estado_anterior', 'estado_nuevo', 'resultado_notificacion'],
  },
  EP08_Recordatorios: {
    Recordatorios: ['recordatorio_id', 'usuario_id', 'evento_id', 'inscripcion_id', 'tipo_recordatorio', 'fecha_programada', 'fecha_envio', 'estado', 'clave_idempotencia'],
  },
  EP09_Notificaciones: {
    Notificaciones: ['notificacion_id', 'usuario_id', 'tipo', 'titulo', 'mensaje', 'evento_id', 'inscripcion_id', 'fecha', 'gmail_estado', 'telegram_estado', 'gmail_error', 'telegram_error', 'clave_idempotencia'],
  },
  EP10_Soporte: {
    Conversaciones: ['conversation_id', 'usuario_id', 'visitor_id', 'fecha_inicio', 'fecha_ultima_interaccion', 'estado'],
    Mensajes: ['message_id', 'conversation_id', 'usuario_id', 'visitor_id', 'rol', 'mensaje', 'timestamp'],
  },
};

function crearSheetsEventPass() {
  const carpetas = DriveApp.getFoldersByName(CARPETA);
  const carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA);
  const ids = {};

  Object.keys(ESTRUCTURA).forEach(function (archivo) {
    const ss = abrirOCrear_(carpeta, archivo);
    const hojas = ESTRUCTURA[archivo];
    const nombres = Object.keys(hojas);

    nombres.forEach(function (nombreHoja, i) {
      let hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) {
        // La primera hoja por defecto ("Hoja 1"/"Sheet1") se renombra en vez de crear otra.
        const porDefecto = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 &&
          nombres.indexOf(ss.getSheets()[0].getName()) === -1;
        hoja = porDefecto && i === 0 ? ss.getSheets()[0].setName(nombreHoja) : ss.insertSheet(nombreHoja);
      }
      const columnas = hojas[nombreHoja];
      // Todo como texto sin formato: Sheets no convierte fechas ISO ni IDs.
      hoja.getRange(1, 1, hoja.getMaxRows(), Math.max(columnas.length, hoja.getMaxColumns())).setNumberFormat('@');
      hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    });

    ids[archivo.slice(0, 4)] = ss.getId();
  });

  Logger.log('Carpeta: ' + carpeta.getUrl());
  Logger.log('Copia esto en scripts/n8n/config.local.json:\n"sheets": ' + JSON.stringify(ids, null, 2));
}

function abrirOCrear_(carpeta, nombre) {
  const archivos = carpeta.getFilesByName(nombre);
  if (archivos.hasNext()) return SpreadsheetApp.openById(archivos.next().getId());
  const ss = SpreadsheetApp.create(nombre);
  DriveApp.getFileById(ss.getId()).moveTo(carpeta);
  return ss;
}
