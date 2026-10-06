import { ESTADOS, type EstadoVisual } from "./tokens";

export function StatusBadge({ estado, className = "" }: { estado: EstadoVisual; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
      style={{ backgroundColor: e.bg, color: e.fg }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.fg }} />
      {e.etiqueta}
    </span>
  );
}
