import type { ReactNode } from "react";

type Tipo = "exito" | "error" | "info";

const estilos: Record<Tipo, string> = {
  exito: "border-green-300 bg-green-50 text-green-900",
  error: "border-red-300 bg-red-50 text-red-900",
  info: "border-blue-300 bg-blue-50 text-blue-900",
};

export function Alert({ tipo, children }: { tipo: Tipo; children: ReactNode }) {
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 ${estilos[tipo]}`}>
      {children}
    </div>
  );
}
