import Link from "next/link";
import type { Disponibilidad, EventoPublico } from "@/types/api";

const etiqueta: Record<Disponibilidad, { texto: string; clase: string }> = {
  DISPONIBLE: { texto: "Cupos disponibles", clase: "bg-green-100 text-green-800" },
  LLENO: { texto: "Lleno · lista de espera", clase: "bg-amber-100 text-amber-800" },
  CERRADO: { texto: "Cerrado", clase: "bg-slate-200 text-slate-700" },
  CANCELADO: { texto: "Cancelado", clase: "bg-red-100 text-red-800" },
};

export function EventoCard({ evento }: { evento: EventoPublico }) {
  const e = etiqueta[evento.disponibilidad];
  return (
    <Link
      href={`/eventos/${evento.evento_id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {evento.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={evento.imagen_url} alt="" className="h-40 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-semibold uppercase text-marca">{evento.categoria}</span>
        <h3 className="font-bold leading-tight">{evento.nombre}</h3>
        <p className="text-sm text-slate-600">
          📅 {evento.fecha} · {evento.hora} <br />📍 {evento.lugar}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}>{e.texto}</span>
          {evento.disponibilidad === "DISPONIBLE" && (
            <span className="text-sm text-slate-700">{evento.cupos_disponibles} cupos</span>
          )}
        </div>
      </div>
    </Link>
  );
}
