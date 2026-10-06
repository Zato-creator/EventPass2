// WF05 — Catálogo público.  Dueño: DEV-A.
import type { ApiResponse, CatalogoDetalle, CatalogoListado } from "@/types/api";
import { EVENTOS_MOCK } from "@/lib/mocks/catalogo";
import { getVisitorId, llamarN8n } from "./client";

const USAR_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export async function listarEventos(categoria?: string): Promise<ApiResponse<CatalogoListado>> {
  if (USAR_MOCKS) {
    const eventos = categoria ? EVENTOS_MOCK.filter((e) => e.categoria === categoria) : EVENTOS_MOCK;
    return { ok: true, data: { tipo: categoria ? "FILTRO" : "LISTADO", total: eventos.length, eventos } };
  }
  return llamarN8n<CatalogoListado>("catalogo", {
    method: "GET",
    query: { visitor_id: getVisitorId(), categoria },
  });
}

export async function detalleEvento(evento_id: string): Promise<ApiResponse<CatalogoDetalle>> {
  if (USAR_MOCKS) {
    const evento = EVENTOS_MOCK.find((e) => e.evento_id === evento_id);
    return evento
      ? { ok: true, data: { tipo: "DETALLE", evento } }
      : { ok: false, error: { code: "EVENTO_NO_ENCONTRADO", message: "El evento no existe." } };
  }
  return llamarN8n<CatalogoDetalle>("catalogo", {
    method: "GET",
    query: { visitor_id: getVisitorId(), evento_id },
  });
}
