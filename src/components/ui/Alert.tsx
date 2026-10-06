import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tipo = "exito" | "error" | "info";

const estilos: Record<Tipo, { clase: string; icono: IconName }> = {
  exito: { clase: "border-[#86EFAC] bg-ok-bg text-ok-fg", icono: "check" },
  error: { clase: "border-[#FCA5A5] bg-cancelado-bg text-cancelado-fg", icono: "alert" },
  info: { clase: "border-[#BFD0F7] bg-cat-academico-tint text-navy-deep", icono: "info" },
};

type Props = { tipo: Tipo; titulo?: string; accion?: ReactNode; children: ReactNode };

export function Alert({ tipo, titulo, accion, children }: Props) {
  const e = estilos[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[15px] ${e.clase}`}
    >
      <Icon name={e.icono} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-bold">{titulo}</p>}
        <div>{children}</div>
      </div>
      {accion && <div className="shrink-0 self-center">{accion}</div>}
    </div>
  );
}
