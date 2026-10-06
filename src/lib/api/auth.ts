// WF02 — Autenticación y sesiones.  Dueño: DEV-A.
import type { LoginData } from "@/types/api";
import { llamarN8n } from "./client";

export const login = (email: string, password: string) =>
  llamarN8n<LoginData>("auth", { body: { accion: "login", email, password } });

export const logout = () =>
  llamarN8n<{ cerrada: boolean }>("auth", { body: { accion: "logout" }, privado: true });

export const validarSesion = () =>
  llamarN8n<{ valida: boolean; usuario_id: string; expira_en: string }>("auth", {
    body: { accion: "validar" },
    privado: true,
  });
