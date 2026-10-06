// Mapas visuales: categoría → color/ícono y estado → etiqueta/colores.
// Solo presentación: los estados y cupos vienen calculados por n8n.
import type { Categoria, EstadoInscripcion, EventoPublico } from "@/types/api";
import type { IconName } from "./Icon";

export type EstiloCategoria = { color: string; tint: string; icono: IconName };

export const CATEGORIAS: Record<Categoria, EstiloCategoria> = {
  Académico: { color: "#2F5BD3", tint: "#E6EDFC", icono: "book" },
  Deportes: { color: "#1F7A52", tint: "#E3F4EC", icono: "trophy" },
  Cultura: { color: "#B9400E", tint: "#FDEBDD", icono: "palette" },
  Tecnología: { color: "#6D3FD1", tint: "#EEE8FB", icono: "cpu" },
  Comunidad: { color: "#0E7490", tint: "#E0F2F6", icono: "heart" },
};

export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS) as Categoria[];

const NEUTRA: EstiloCategoria = { color: "#4A5470", tint: "#F5F6FA", icono: "calendar" };

export function estiloCategoria(categoria: string): EstiloCategoria {
  return CATEGORIAS[categoria as Categoria] ?? NEUTRA;
}

export type EstadoVisual =
  | "DISPONIBLE"
  | "ULTIMOS"
  | "LLENO"
  | "CERRADO"
  | "CANCELADO"
  | EstadoInscripcion;

export type EstiloEstado = { etiqueta: string; bg: string; fg: string };

export const ESTADOS: Record<EstadoVisual, EstiloEstado> = {
  DISPONIBLE: { etiqueta: "Disponible", bg: "#DCFCE7", fg: "#14532D" },
  ULTIMOS: { etiqueta: "Últimos cupos", bg: "#FFEDD5", fg: "#7C2D12" },
  LLENO: { etiqueta: "Lleno", bg: "#FEF3C7", fg: "#78350F" },
  CERRADO: { etiqueta: "Cerrado", bg: "#E2E8F0", fg: "#334155" },
  CANCELADO: { etiqueta: "Cancelado", bg: "#FEE2E2", fg: "#7F1D1D" },
  CONFIRMADA: { etiqueta: "Confirmada", bg: "#DCFCE7", fg: "#14532D" },
  LISTA_ESPERA: { etiqueta: "Lista de espera", bg: "#FEF3C7", fg: "#78350F" },
  CANCELADA: { etiqueta: "Cancelada", bg: "#FEE2E2", fg: "#7F1D1D" },
};

// "Últimos cupos" es solo un matiz visual de DISPONIBLE (≤ 20 % de la capacidad libre).
export function estadoVisualEvento(
  ev: Pick<EventoPublico, "disponibilidad" | "cupos_disponibles" | "capacidad">,
): EstadoVisual {
  if (ev.disponibilidad !== "DISPONIBLE") return ev.disponibilidad;
  return ev.capacidad > 0 && ev.cupos_disponibles <= Math.max(1, Math.floor(ev.capacidad * 0.2))
    ? "ULTIMOS"
    : "DISPONIBLE";
}
