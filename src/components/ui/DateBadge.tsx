const fmtMes = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "short" });
const fmtDia = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric" });

// Partes de la fecha del evento ("2026-10-07") en zona Bogotá.
export function partesFecha(fecha: string): { mes: string; dia: string } | null {
  const d = new Date(`${fecha}T12:00:00-05:00`);
  if (!fecha || Number.isNaN(d.getTime())) return null;
  return { mes: fmtMes.format(d).replace(".", "").toUpperCase(), dia: fmtDia.format(d) };
}

// Badge tipo calendario: MES en el color de la categoría + día grande.
export function DateBadge({ fecha, color, className = "" }: { fecha: string; color: string; className?: string }) {
  const p = partesFecha(fecha);
  if (!p) return null;
  return (
    <span
      className={`flex w-14 flex-col items-center rounded-[10px] bg-surface py-1.5 leading-none shadow-sm ${className}`}
    >
      <span className="text-[11px] font-bold tracking-wider" style={{ color }}>
        {p.mes}
      </span>
      <span className="mt-1 font-display text-2xl font-bold text-ink">{p.dia}</span>
    </span>
  );
}
