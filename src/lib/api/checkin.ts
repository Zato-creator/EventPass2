// WF12 — Check-in digital.  Dueño: DEV-A.
import type { CheckinData, CheckinRespuesta } from "@/types/api";
import { llamarN8n } from "./client";

export const registrarCheckin = (datos: { inscripcion_id: string; evento_id: string }) =>
  llamarN8n<CheckinData>("checkin-digital", { body: datos }) as Promise<CheckinRespuesta>;
