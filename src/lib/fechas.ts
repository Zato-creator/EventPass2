// Formato de fechas para mostrar en la interfaz, siempre en zona America/Bogota.  Dueño: DEV-A.
const ZONA = "America/Bogota";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fmtHora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });
const fmtFechaHora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, dateStyle: "medium", timeStyle: "short" });

// Fecha y hora de un evento ("2026-10-15", "08:00") → "mié, 15 oct 2026 · 8:00 a. m."
export function fechaEvento(fecha: string, hora: string): string {
  if (!fecha) return "";
  const d = new Date(`${fecha}T${hora || "00:00"}:00-05:00`);
  if (Number.isNaN(d.getTime())) return `${fecha} ${hora}`.trim();
  return `${fmtFecha.format(d)} · ${fmtHora.format(d)}`;
}

// Fecha ISO con offset ("2026-10-06T08:30:15-05:00") → "6 oct 2026, 8:30 a. m."
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmtFechaHora.format(d);
}
