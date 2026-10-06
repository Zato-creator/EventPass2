"use client";
import { RequiereSesion } from "@/components/RequiereSesion";

export default function MisInscripcionesPage() {
  return (
    <RequiereSesion>
      <h1 className="text-2xl font-bold">Mis inscripciones</h1>
      {/* TODO(DEV-B): listar (listarInscripciones), editar acreditación/observaciones (actualizarInscripcion) y cancelar (cancelarInscripcion) — src/lib/api/inscripciones.ts. Manejar loading / éxito / error. */}
      <p className="mt-4 text-slate-600">En construcción.</p>
    </RequiereSesion>
  );
}
