"use client";
// Detalle de evento (WF05) + inscripción (WF06).
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { EventoPublico } from "@/types/api";
import { detalleEvento } from "@/lib/api/catalogo";
import { fechaEvento } from "@/lib/fechas";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";
import { DisponibilidadBadge } from "@/components/EventoCard";
import { InscripcionForm } from "@/components/InscripcionForm";

export default function DetalleEventoPage() {
  const { id } = useParams<{ id: string }>();
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      const res = await detalleEvento(id);
      if (res.ok) {
        setEvento(res.data.evento);
        setError(null);
      } else setError(res.error.message);
      setCargando(false);
    },
    [id],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Loading texto="Cargando evento…" />;
  if (error || !evento) return <Alert tipo="error">{error ?? "Evento no encontrado."}</Alert>;

  return (
    <article className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Link href="/eventos" className="text-sm text-marca hover:underline">← Volver al catálogo</Link>
        {evento.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.imagen_url} alt="" className="h-64 w-full rounded-xl object-cover" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold uppercase text-marca">{evento.categoria}</span>
          <DisponibilidadBadge disponibilidad={evento.disponibilidad} />
        </div>
        <h1 className="text-3xl font-bold">{evento.nombre}</h1>
        <p className="whitespace-pre-line text-slate-700">{evento.descripcion}</p>
        <ul className="space-y-1 text-slate-700">
          <li>📅 {fechaEvento(evento.fecha, evento.hora)}</li>
          <li>📍 {evento.lugar}</li>
          <li>🏫 Organiza: {evento.organizador}</li>
          <li>
            👥 {evento.cupos_disponibles} de {evento.capacidad} cupos disponibles
            {evento.en_lista_espera > 0 && ` · ${evento.en_lista_espera} en lista de espera`}
          </li>
        </ul>
      </div>
      <aside className="lg:pt-10">
        <InscripcionForm evento={evento} onInscrito={() => cargar(true)} />
      </aside>
    </article>
  );
}
