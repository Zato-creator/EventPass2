"use client";
import { useEffect } from "react";
import { Icon } from "./Icon";

type Props = {
  tipo?: "exito" | "error" | "info";
  mensaje: string | null;
  onCerrar: () => void;
  duracionMs?: number;
};

const estilos = {
  exito: { clase: "bg-ink text-white", icono: "check", color: "text-[#86EFAC]" },
  error: { clase: "bg-cancelado-fg text-white", icono: "alert", color: "text-white" },
  info: { clase: "bg-ink text-white", icono: "info", color: "text-marigold" },
} as const;

// Aviso flotante breve (abajo a la izquierda, para no tapar el chat).
export function Toast({ tipo = "exito", mensaje, onCerrar, duracionMs = 4000 }: Props) {
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(onCerrar, duracionMs);
    return () => clearTimeout(t);
  }, [mensaje, onCerrar, duracionMs]);

  if (!mensaje) return null;
  const e = estilos[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`fixed bottom-6 left-4 right-4 z-50 flex items-center gap-3 rounded-[14px] px-4 py-3 shadow-lg sm:left-6 sm:right-auto sm:max-w-sm ${e.clase}`}
    >
      <Icon name={e.icono} size={20} className={`shrink-0 ${e.color}`} />
      <p className="flex-1 text-[15px]">{mensaje}</p>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-white/10"
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
