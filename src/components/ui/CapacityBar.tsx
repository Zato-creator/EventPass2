import type { Disponibilidad } from "@/types/api";

type Props = {
  confirmados: number;
  capacidad: number;
  disponibilidad: Disponibilidad;
  ultimos?: boolean;
  alto?: 6 | 12;
};

// Barra de ocupación: confirmados / capacidad (los números vienen de n8n).
export function CapacityBar({ confirmados, capacidad, disponibilidad, ultimos = false, alto = 6 }: Props) {
  const pct = capacidad > 0 ? Math.min(100, Math.round((confirmados / capacidad) * 100)) : 0;
  const color =
    disponibilidad === "CERRADO" || disponibilidad === "CANCELADO"
      ? "#94A3B8"
      : disponibilidad === "LLENO"
        ? "#F4B23E"
        : ultimos
          ? "#EA7A1F"
          : "#1C3A8A";
  return (
    <div
      role="progressbar"
      aria-label="Ocupación del evento"
      aria-valuemin={0}
      aria-valuemax={capacidad}
      aria-valuenow={Math.min(confirmados, capacidad)}
      className="w-full overflow-hidden rounded-full bg-line"
      style={{ height: alto }}
    >
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
