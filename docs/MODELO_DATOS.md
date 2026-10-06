# Modelo de datos — Google Sheets

Carpeta de Drive: `EventPass_Colegios/` compartida entre DEV-A y DEV-B.
**Fila 1 = encabezados exactos** (copiar y pegar de aquí). Sin filas vacías intermedias. Columnas de fecha con formato *Texto sin formato* para que Sheets no las transforme.

## Convenciones

| Elemento | Formato | Ejemplo |
|---|---|---|
| IDs | `PREFIJO-YYYYMMDDHHmmss-XXXX` (4 hex aleatorios) | `INS-20261006083015-9F2C` |
| Fechas/horas | ISO 8601 con offset Bogotá | `2026-10-06T08:30:15-05:00` |
| Fecha de evento | `YYYY-MM-DD` + hora `HH:mm` en columnas separadas | `2026-10-15` / `08:00` |
| Email | minúsculas, sin espacios | `laura@correo.com` |

Prefijos: `USR` usuario · `AUD` auditoría · `SES` sesión · `COD` código Telegram · `VIN` vinculación · `EVT` evento · `CON` consulta catálogo · `INS` inscripción · `REA` reasignación · `REC` recordatorio · `NOT` notificación · `CNV` conversación · `MSG` mensaje.

## Dueños

| Archivo | Workflow que escribe | Dueño |
|---|---|---|
| EP01_Usuarios | WF01 | DEV-A |
| EP02_Sesiones | WF02, WF11 | DEV-A |
| EP03_Telegram | WF03 | DEV-A |
| EP04_Eventos | WF04 | DEV-B |
| EP05_Catalogo_Log | WF05 | DEV-B |
| EP06_Inscripciones | WF06, WF07 (solo cambia estado) | DEV-A |
| EP07_Reasignaciones | WF07 | DEV-A |
| EP08_Recordatorios | WF08 | DEV-B |
| EP09_Notificaciones | WF09 | DEV-A |
| EP10_Soporte | WF10 | DEV-B |

> WF07 actualiza el estado en EP06 porque la inscripción vive allí; su **registro principal** (la reasignación) va en EP07. Documentarlo así en el README.

---

## EP01_Usuarios
**Usuarios**
```
usuario_id	nombre	email_normalizado	password_hash	password_salt	estado	fecha_registro	fecha_actualizacion
```
Estados: `ACTIVO`, `INACTIVO`.

**Auditoria_Usuarios**
```
auditoria_id	usuario_id	accion	fecha	resultado	detalle
```
`accion`: REGISTRAR, ACTUALIZAR, DESACTIVAR, CAMBIAR_PASSWORD · `resultado`: OK, ERROR.

## EP02_Sesiones
**Sesiones**
```
session_id	usuario_id	session_token	creada_en	expira_en	estado	cerrada_en	ultima_validacion
```
Estados: `ACTIVA`, `CERRADA`, `EXPIRADA`. Token: 32 bytes aleatorios en hex. Vigencia 12 h.

## EP03_Telegram
**Codigos_Vinculacion**
```
codigo_id	usuario_id	codigo	creado_en	expira_en	estado	usado_en
```
Estados: `PENDIENTE`, `USADO`, `EXPIRADO`, `CANCELADO`. Código: 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Vigencia 10 min.

**Vinculaciones**
```
vinculacion_id	usuario_id	chat_id	telegram_username	fecha_vinculacion	estado
```
Estados: `ACTIVA`, `INACTIVA`. Un usuario tiene como máximo una ACTIVA.

## EP04_Eventos
**Eventos**
```
evento_id	nombre	categoria	descripcion	fecha	hora	lugar	capacidad	imagen_url	organizador	estado	fecha_creacion	fecha_actualizacion
```
Estados: `BORRADOR`, `PUBLICADO`, `CERRADO`, `CANCELADO`.
Categorías: `Académico`, `Deportes`, `Cultura`, `Tecnología`, `Comunidad`.
**No existe columna de cupos disponibles.**

**Auditoria_Eventos**
```
auditoria_id	evento_id	accion	fecha	resultado	detalle
```
`accion`: CREATE, READ, UPDATE, PUBLICAR, CERRAR, CANCELAR.

## EP05_Catalogo_Log
**Consultas_Catalogo**
```
consulta_id	fecha	tipo	evento_id	categoria	resultado_count	visitor_id	status_http
```
Tipos: `LISTADO`, `DETALLE`, `FILTRO`.

## EP06_Inscripciones
**Inscripciones**
```
inscripcion_id	usuario_id	evento_id	estado	fecha_inscripcion	fecha_actualizacion	nombre_acreditacion	observaciones	origen	orden_espera
```
Estados: `CONFIRMADA`, `LISTA_ESPERA`, `CANCELADA`.
`origen`: `WEB` (creada desde la web). Si WF07 la promueve, `origen` no cambia; la trazabilidad queda en EP07.
`orden_espera`: posición al entrar a la lista (informativa). **El orden real de promoción es `fecha_inscripcion ASC`.**
Inscripción activa = estado CONFIRMADA o LISTA_ESPERA.

**Auditoria_Inscripciones**
```
auditoria_id	inscripcion_id	usuario_id	evento_id	accion	estado_anterior	estado_nuevo	fecha	resultado	detalle
```
`accion`: CREAR, ACTUALIZAR, CANCELAR, RECHAZAR_DUPLICADO, PROMOVER.

## EP07_Reasignaciones
**Reasignaciones**
```
reasignacion_id	evento_id	inscripcion_id	usuario_id	fecha	orden_lista	estado_anterior	estado_nuevo	resultado_notificacion
```
`resultado_notificacion`: `gmail:ENVIADO|telegram:ENVIADO` (texto combinado de lo que devuelve WF09).

## EP08_Recordatorios
**Recordatorios**
```
recordatorio_id	usuario_id	evento_id	inscripcion_id	tipo_recordatorio	fecha_programada	fecha_envio	estado	clave_idempotencia
```
Tipos: `R24H` (faltan ≤24 h), `R1H` (falta ≤1 h). Estados: `PENDIENTE`, `ENVIADO`, `ERROR`, `OMITIDO`.
`OMITIDO`: la inscripción se detectó cuando ya faltaba ≤1 h, así que el R24H no se envía (se registra una sola vez como OMITIDO) y solo se envía el R1H. Si la clave ya existe en cualquier estado, WF08 no vuelve a enviar.
`clave_idempotencia` = `usuario_id|evento_id|tipo_recordatorio`.

## EP09_Notificaciones
**Notificaciones**
```
notificacion_id	usuario_id	tipo	titulo	mensaje	evento_id	inscripcion_id	fecha	gmail_estado	telegram_estado	gmail_error	telegram_error	clave_idempotencia
```
Estados de canal: `PENDIENTE`, `ENVIADO`, `ERROR`, `NO_APLICA`.
Tipos: `INSCRIPCION_CONFIRMADA`, `LISTA_ESPERA`, `REASIGNACION`, `INSCRIPCION_CANCELADA`, `EVENTO_CANCELADO`, `RECORDATORIO`.
`clave_idempotencia` sugeridas: `TIPO|inscripcion_id` (o `RECORDATORIO|usuario|evento|tipo`).

## EP10_Soporte
**Conversaciones**
```
conversation_id	usuario_id	visitor_id	fecha_inicio	fecha_ultima_interaccion	estado
```
Estados: `ABIERTA`, `CERRADA` (se cierra por inactividad >30 min, opcional).

**Mensajes**
```
message_id	conversation_id	usuario_id	visitor_id	rol	mensaje	timestamp
```
Roles: `USER`, `ASSISTANT`, `SYSTEM`.

---

## Datos de prueba (EP04) — temática colegios

Cargarlos con el **Form Trigger de WF04** (así quedan en auditoría). Los eventos CANCELADO y CERRADO se crean como PUBLICADO y luego se les aplica CANCELAR / CERRAR desde el mismo formulario (así la auditoría muestra la transición). Fechas pensadas para la entrega del 6 de octubre de 2026; si la evaluación es otro día, ajustar EVT-03 para que siga siendo "próximo".

| # | Nombre | Categoría | Fecha / hora | Lugar | Capacidad | Estado | Rol en la prueba |
|---|---|---|---|---|---|---|---|
| 1 | Feria de Ciencias Intercolegial 2026 | Académico | 2026-10-20 08:00 | Coliseo Colegio San Pedro | 120 | PUBLICADO | **Con cupos disponibles** |
| 2 | Taller de Robótica con Arduino | Tecnología | 2026-10-14 14:00 | Laboratorio de Sistemas, Bloque C | 2 | PUBLICADO | **Lleno** (2 confirmadas de prueba) |
| 3 | Escuela de Padres: Uso Seguro de Redes | Comunidad | 2026-10-07 09:00 | Auditorio Principal | 80 | PUBLICADO | **Próximo** (dispara R24H desde el 6-oct 09:00) |
| 4 | Torneo Intercolegial de Microfútbol | Deportes | 2026-10-25 09:00 | Cancha Múltiple Municipal | 64 | PUBLICADO | Disponible |
| 5 | Muestra Cultural: Danzas Colombianas | Cultura | 2026-10-30 16:00 | Teatro del Colegio | 150 | **CANCELADO** | **Cancelado** |
| 6 | Olimpiadas de Matemáticas — Fase Local | Académico | 2026-09-28 07:30 | Aulas 101–110 | 60 | **CERRADO** | **Cerrado** |
| 7 | Jornada de Orientación Vocacional 11° | Comunidad | 2026-11-05 08:00 | Biblioteca Central | 40 | BORRADOR | No debe aparecer en el catálogo |

Para el evento lleno: crear 2 usuarios de prueba (`prueba1@…`, `prueba2@…`), vincular Telegram e inscribirlos. Un tercer usuario queda en LISTA_ESPERA y sirve para demostrar WF07.
Imágenes: URLs públicas (Unsplash) o archivos en `public/eventos/` servidos desde Vercel.
