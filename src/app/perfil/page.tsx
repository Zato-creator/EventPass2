"use client";
import { RequiereSesion } from "@/components/RequiereSesion";

export default function PerfilPage() {
  return (
    <RequiereSesion>
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      {/* TODO(DEV-B): ver datos (obtenerPerfil), editar nombre/contraseña (actualizarPerfil) y desactivar cuenta (desactivarCuenta) — src/lib/api/usuarios.ts. Manejar loading / éxito / error. */}
      <p className="mt-4 text-slate-600">En construcción.</p>
    </RequiereSesion>
  );
}
