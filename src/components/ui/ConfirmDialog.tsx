"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Spinner } from "./Loading";

type Props = {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  ocupado?: boolean;
  peligro?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
};

// Modal de confirmación accesible (Escape cierra, foco inicial en la opción segura).
export function ConfirmDialog({
  abierto,
  titulo,
  children,
  textoConfirmar,
  textoCancelar = "Volver",
  ocupado = false,
  peligro = false,
  onConfirmar,
  onCerrar,
}: Props) {
  const seguroRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    seguroRef.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && !ocupado && onCerrar();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [abierto, ocupado, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={() => !ocupado && onCerrar()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby="confirm-texto"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[18px] bg-surface p-6 shadow-2xl"
      >
        <h2 id="confirm-titulo" className="font-display text-2xl font-bold text-ink">
          {titulo}
        </h2>
        <div id="confirm-texto" className="mt-2 text-[15px] text-muted">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={seguroRef}
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            className="min-h-11 rounded-[10px] border border-input-border px-5 text-[15px] font-bold text-ink hover:bg-ground disabled:opacity-60"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-bold text-white disabled:opacity-60 ${
              peligro ? "bg-[#B91C1C] hover:bg-cancelado-fg" : "bg-navy hover:bg-navy-deep"
            }`}
          >
            {ocupado && <Spinner className="h-4 w-4" />}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
