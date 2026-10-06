// Encabezados exactos de cada hoja (docs/MODELO_DATOS.md).
export const C = {
  Usuarios: ["usuario_id", "nombre", "email_normalizado", "password_hash", "password_salt", "estado", "fecha_registro", "fecha_actualizacion"],
  Auditoria_Usuarios: ["auditoria_id", "usuario_id", "accion", "fecha", "resultado", "detalle"],
  Sesiones: ["session_id", "usuario_id", "session_token", "creada_en", "expira_en", "estado", "cerrada_en", "ultima_validacion"],
  Codigos_Vinculacion: ["codigo_id", "usuario_id", "codigo", "creado_en", "expira_en", "estado", "usado_en"],
  Vinculaciones: ["vinculacion_id", "usuario_id", "chat_id", "telegram_username", "fecha_vinculacion", "estado"],
  Eventos: ["evento_id", "nombre", "categoria", "descripcion", "fecha", "hora", "lugar", "capacidad", "imagen_url", "organizador", "estado", "fecha_creacion", "fecha_actualizacion"],
  Auditoria_Eventos: ["auditoria_id", "evento_id", "accion", "fecha", "resultado", "detalle"],
  Consultas_Catalogo: ["consulta_id", "fecha", "tipo", "evento_id", "categoria", "resultado_count", "visitor_id", "status_http"],
  Inscripciones: ["inscripcion_id", "usuario_id", "evento_id", "estado", "fecha_inscripcion", "fecha_actualizacion", "nombre_acreditacion", "observaciones", "origen", "orden_espera"],
  Auditoria_Inscripciones: ["auditoria_id", "inscripcion_id", "usuario_id", "evento_id", "accion", "estado_anterior", "estado_nuevo", "fecha", "resultado", "detalle"],
  Reasignaciones: ["reasignacion_id", "evento_id", "inscripcion_id", "usuario_id", "fecha", "orden_lista", "estado_anterior", "estado_nuevo", "resultado_notificacion"],
  Recordatorios: ["recordatorio_id", "usuario_id", "evento_id", "inscripcion_id", "tipo_recordatorio", "fecha_programada", "fecha_envio", "estado", "clave_idempotencia"],
  Notificaciones: ["notificacion_id", "usuario_id", "tipo", "titulo", "mensaje", "evento_id", "inscripcion_id", "fecha", "gmail_estado", "telegram_estado", "gmail_error", "telegram_error", "clave_idempotencia"],
  Conversaciones: ["conversation_id", "usuario_id", "visitor_id", "fecha_inicio", "fecha_ultima_interaccion", "estado"],
  Mensajes: ["message_id", "conversation_id", "usuario_id", "visitor_id", "rol", "mensaje", "timestamp"],
};
