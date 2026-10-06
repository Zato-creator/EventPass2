// WF03 — Vinculación con Telegram.  Dueño: DEV-A.
import type { CodigoVinculacion, EstadoTelegram } from "@/types/api";
import { llamarN8n } from "./client";

export const generarCodigo = () =>
  llamarN8n<CodigoVinculacion>("telegram", { body: { accion: "generar_codigo" }, privado: true });

export const estadoTelegram = () =>
  llamarN8n<EstadoTelegram>("telegram", { body: { accion: "estado" }, privado: true });
