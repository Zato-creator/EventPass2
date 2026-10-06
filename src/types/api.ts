// Tipos de los contratos frontend ↔ n8n.  Dueño: DEV-A.
// Fuente de verdad: docs/CONTRATOS_API.md — si cambias algo aquí, cámbialo allá en el mismo commit.

export type ApiOk<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiOk<T> | ApiError;

// ── Usuarios / Auth ──
export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export type Usuario = {
  usuario_id: string;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
};

export type Perfil = Usuario & {
  fecha_registro: string;
  telegram_vinculado: boolean;
  telegram_username: string | null;
};

export type LoginData = {
  session_token: string;
  expira_en: string;
  usuario: Pick<Usuario, "usuario_id" | "nombre" | "email">;
};

// ── Telegram ──
export type CodigoVinculacion = {
  codigo: string;
  expira_en: string;
  bot_username: string;
  instruccion: string;
};

export type EstadoTelegram = {
  vinculado: boolean;
  telegram_username: string | null;
  fecha_vinculacion: string | null;
};

// ── Catálogo ──
export type Categoria = "Académico" | "Deportes" | "Cultura" | "Tecnología" | "Comunidad";
export type EstadoEventoPublico = "PUBLICADO" | "CERRADO" | "CANCELADO";
export type Disponibilidad = "DISPONIBLE" | "LLENO" | "CERRADO" | "CANCELADO";

export type EventoPublico = {
  evento_id: string;
  nombre: string;
  categoria: Categoria;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  capacidad: number;
  inscritos_confirmados: number;
  cupos_disponibles: number;
  en_lista_espera: number;
  imagen_url: string;
  organizador: string;
  estado: EstadoEventoPublico;
  disponibilidad: Disponibilidad;
};

export type CatalogoListado = { tipo: "LISTADO" | "FILTRO"; total: number; eventos: EventoPublico[] };
export type CatalogoDetalle = { tipo: "DETALLE"; evento: EventoPublico };

// ── Inscripciones ──
export type EstadoInscripcion = "CONFIRMADA" | "LISTA_ESPERA" | "CANCELADA";

export type Inscripcion = {
  inscripcion_id: string;
  usuario_id: string;
  evento_id: string;
  estado: EstadoInscripcion;
  fecha_inscripcion: string;
  fecha_actualizacion: string;
  nombre_acreditacion: string;
  observaciones: string;
  origen: "WEB" | "REASIGNACION";
  orden_espera: number | null;
};

export type InscripcionConEvento = Inscripcion & {
  evento: Pick<EventoPublico, "nombre" | "fecha" | "hora" | "lugar" | "estado">;
};
