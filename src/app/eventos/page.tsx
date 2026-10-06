"use client";
// Catálogo público (WF05). Ejemplo del patrón loading / éxito / error que deben seguir todas las páginas.
import { useEffect, useState } from "react";
import type { Categoria, EventoPublico } from "@/types/api";
import { listarEventos } from "@/lib/api/catalogo";
import { EventoCard } from "@/components/EventoCard";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";

const CATEGORIAS: Categoria[] = ["Académico", "Deportes", "Cultura", "Tecnología", "Comunidad"];

export default function EventosPage() {
  const [categoria, setCategoria] = useState("");
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    listarEventos(categoria || undefined).then((res) => {
      if (!activo) return;
      if (res.ok) setEventos(res.data.eventos);
      else setError(res.error.message);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [categoria]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Eventos escolares</h1>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {cargando && <Loading texto="Cargando eventos…" />}
      {!cargando && error && <Alert tipo="error">{error}</Alert>}
      {!cargando && !error && eventos.length === 0 && (
        <Alert tipo="info">No hay eventos en esta categoría por ahora.</Alert>
      )}
      {!cargando && !error && eventos.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((ev) => (
            <EventoCard key={ev.evento_id} evento={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
