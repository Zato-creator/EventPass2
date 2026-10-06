"use client";
// Detalle de evento (WF05) + botón de inscripción (WF06).
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { EventoPublico } from "@/types/api";
import { detalleEvento } from "@/lib/api/catalogo";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";

export default function DetalleEventoPage() {
  const { id } = useParams<{ id: string }>();
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detalleEvento(id).then((res) => {
      if (res.ok) setEvento(res.data.evento);
      else setError(res.error.message);
      setCargando(false);
    });
  }, [id]);

  if (cargando) return <Loading texto="Cargando evento…" />;
  if (error || !evento) return <Alert tipo="error">{error ?? "Evento no encontrado."}</Alert>;

  return (
    <article className="space-y-4">
      <Link href="/eventos" className="text-sm text-marca hover:underline">← Volver al catálogo</Link>
      {evento.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={evento.imagen_url} alt="" className="h-64 w-full rounded-xl object-cover" />
      )}
      <span className="text-sm font-semibold uppercase text-marca">{evento.categoria}</span>
      <h1 className="text-3xl font-bold">{evento.nombre}</h1>
      <p className="text-slate-700">{evento.descripcion}</p>
      <ul className="space-y-1 text-slate-700">
        <li>📅 {evento.fecha} a las {evento.hora}</li>
        <li>📍 {evento.lugar}</li>
        <li>🏫 Organiza: {evento.organizador}</li>
        <li>👥 {evento.cupos_disponibles} de {evento.capacidad} cupos disponibles · {evento.en_lista_espera} en lista de espera</li>
      </ul>
      {/* TODO(DEV-B): botón "Inscribirme" usando crearInscripcion() de src/lib/api/inscripciones.ts,
          visible solo si evento.estado === "PUBLICADO", con estados loading / éxito / error. */}
    </article>
  );
}
