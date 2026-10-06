// WF01 — Usuarios CRUD.  Dueño: DEV-A.
import type { Perfil, Usuario } from "@/types/api";
import { llamarN8n } from "./client";

export const registrar = (nombre: string, email: string, password: string) =>
  llamarN8n<Usuario>("usuarios", { body: { accion: "registrar", nombre, email, password } });

export const obtenerPerfil = () =>
  llamarN8n<Perfil>("usuarios", { body: { accion: "perfil" }, privado: true });

export const actualizarPerfil = (cambios: {
  nombre?: string;
  password_actual?: string;
  password_nueva?: string;
}) => llamarN8n<Perfil>("usuarios", { body: { accion: "actualizar", ...cambios }, privado: true });

export const desactivarCuenta = (password: string) =>
  llamarN8n<{ estado: "INACTIVO" }>("usuarios", {
    body: { accion: "desactivar", password },
    privado: true,
  });
