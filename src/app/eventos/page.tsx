"use client";
// Catálogo público (WF05). La categoría se filtra en n8n; búsqueda, orden y "solo con cupos" se aplican
// sobre lo que ya llegó (solo presentación).
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EventoPublico } from "@/types/api";
import { listarEventos } from "@/lib/api/catalogo";
import { EventoCard } from "@/components/EventoCard";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { LISTA_CATEGORIAS, estiloCategoria } from "@/components/ui/tokens";

type Orden = "proximos" | "lejanos" | "cupos" | "nombre";

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: "proximos", texto: "Próximos primero" },
  { valor: "lejanos", texto: "Más lejanos primero" },
  { valor: "cupos", texto: "Más cupos libres" },
  { valor: "nombre", texto: "Nombre (A–Z)" },
];

const clave = (ev: EventoPublico) => `${ev.fecha}T${ev.hora || "00:00"}`;
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Catalogo() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [categoria, setCategoria] = useState(params.get("categoria") ?? "");
  const [busqueda, setBusqueda] = useState(params.get("q") ?? "");
  const [orden, setOrden] = useState<Orden>("proximos");
  const [soloCupos, setSoloCupos] = useState(false);
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

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
  }, [categoria, intento]);

  // Mantener la URL sincronizada para poder compartir el filtro.
  useEffect(() => {
    const q = new URLSearchParams();
    if (categoria) q.set("categoria", categoria);
    if (busqueda.trim()) q.set("q", busqueda.trim());
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [categoria, busqueda, pathname, router]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const lista = eventos.filter((ev) => {
      if (soloCupos && ev.disponibilidad !== "DISPONIBLE") return false;
      if (!q) return true;
      return normalizar(`${ev.nombre} ${ev.lugar} ${ev.categoria} ${ev.organizador}`).includes(q);
    });
    return [...lista].sort((a, b) => {
      if (orden === "lejanos") return clave(b).localeCompare(clave(a));
      if (orden === "cupos") return b.cupos_disponibles - a.cupos_disponibles;
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return clave(a).localeCompare(clave(b));
    });
  }, [eventos, busqueda, soloCupos, orden]);

  const filtrosActivos = Boolean(categoria || busqueda.trim() || soloCupos);
  const limpiar = () => {
    setCategoria("");
    setBusqueda("");
    setSoloCupos(false);
  };

  const chip = (valor: string, texto: string) => {
    const activo = categoria === valor;
    const color = valor ? estiloCategoria(valor).color : undefined;
    return (
      <button
        key={valor || "todas"}
        type="button"
        onClick={() => setCategoria(valor)}
        aria-pressed={activo}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
          activo ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-input-border"
        }`}
      >
        {color && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: activo ? "#FFFFFF" : color }}
          />
        )}
        {texto}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta de navegación" className="text-sm text-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevronRight" size={14} />
          </li>
          <li aria-current="page" className="font-semibold text-ink">
            Eventos
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Eventos escolares</h1>
          <p className="mt-1 text-[15px] text-muted" aria-live="polite">
            {cargando ? "Buscando eventos…" : `${visibles.length} ${visibles.length === 1 ? "evento" : "eventos"} · ${ORDENES.find((o) => o.valor === orden)?.texto.toLowerCase()}`}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="relative flex-1 sm:w-72 sm:flex-none">
            <span className="sr-only">Buscar eventos</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o lugar"
              className="min-h-11 w-full rounded-[10px] border border-input-border bg-surface pl-10 pr-3 text-[15px] text-ink placeholder:text-muted"
            />
          </label>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Ordenar</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="min-h-11 w-full rounded-[10px] border border-input-border bg-surface px-3 text-[15px] text-ink"
            >
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.texto}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
        {chip("", "Todas")}
        {LISTA_CATEGORIAS.map((c) => chip(c, c))}
        <label className="ml-auto inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={soloCupos}
            onChange={(e) => setSoloCupos(e.target.checked)}
            className="h-5 w-5 rounded accent-navy"
          />
          Solo con cupos
        </label>
      </div>

      {cargando && <GridSkeleton cantidad={6} />}

      {!cargando && error && (
        <Alert
          tipo="error"
          titulo="No pudimos cargar los eventos"
          accion={
            <button
              type="button"
              onClick={() => setIntento((n) => n + 1)}
              className="min-h-11 rounded-[10px] border border-cancelado-fg px-4 text-sm font-bold text-cancelado-fg hover:bg-white/60"
            >
              Reintentar
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <EmptyState
          icono="search"
          titulo="No encontramos eventos"
          accion={
            filtrosActivos && (
              <button
                type="button"
                onClick={limpiar}
                className="min-h-11 rounded-[10px] bg-navy px-5 text-[15px] font-bold text-white hover:bg-navy-deep"
              >
                Ver todos los eventos
              </button>
            )
          }
        >
          {filtrosActivos
            ? "Prueba con otra categoría o quita algún filtro."
            : "Por ahora no hay eventos publicados. Vuelve pronto."}
        </EmptyState>
      )}

      {!cargando && !error && visibles.length > 0 && (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
          {visibles.map((ev) => (
            <EventoCard key={ev.evento_id} evento={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventosPage() {
  return (
    <Suspense fallback={<GridSkeleton cantidad={6} />}>
      <Catalogo />
    </Suspense>
  );
}
