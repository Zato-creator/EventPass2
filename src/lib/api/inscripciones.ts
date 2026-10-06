// WF06 — Inscripciones CRUD.  Dueño: DEV-A.
import type { Inscripcion, InscripcionConEvento } from "@/types/api";
import { llamarN8n } from "./client";

export const crearInscripcion = (datos: {
  evento_id: string;
  nombre_acreditacion: string;
  observaciones?: string;
}) =>
  llamarN8n<{ inscripcion: Inscripcion; mensaje: string }>("inscripciones", {
    body: { accion: "crear", ...datos },
    privado: true,
  });

export const listarInscripciones = () =>
  llamarN8n<{ inscripciones: InscripcionConEvento[] }>("inscripciones", {
    body: { accion: "listar" },
    privado: true,
  });

export const actualizarInscripcion = (datos: {
  inscripcion_id: string;
  nombre_acreditacion?: string;
  observaciones?: string;
}) =>
  llamarN8n<{ inscripcion: Inscripcion }>("inscripciones", {
    body: { accion: "actualizar", ...datos },
    privado: true,
  });

export const cancelarInscripcion = (inscripcion_id: string) =>
  llamarN8n<{ inscripcion: Inscripcion }>("inscripciones", {
    body: { accion: "cancelar", inscripcion_id },
    privado: true,
  });
