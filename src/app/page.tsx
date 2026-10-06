"use client";
// Inicio: hero con buscador, categorías, próximos eventos (WF05) y cómo funciona.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { EventoPublico } from "@/types/api";
import { listarEventos } from "@/lib/api/catalogo";
import { fechaEvento } from "@/lib/fechas";
import { EventoCard } from "@/components/EventoCard";
import { Alert } from "@/components/ui/Alert";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { DateBadge } from "@/components/ui/DateBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CATEGORIAS, LISTA_CATEGORIAS, estadoVisualEvento, estiloCategoria } from "@/components/ui/tokens";

const DESCRIPCION_CATEGORIA: Record<string, string> = {
  Académico: "Ferias de ciencia y olimpiadas",
  Deportes: "Torneos e intercolegiados",
  Cultura: "Danzas, teatro y música",
  Tecnología: "Robótica y programación",
  Comunidad: "Escuelas de padres y orientación",
};

const PASOS: { icono: IconName; titulo: string; texto: string }[] = [
  { icono: "user", titulo: "Crea tu cuenta", texto: "Regístrate con tu correo en menos de un minuto." },
  { icono: "send", titulo: "Vincula Telegram", texto: "Genera un código y envíaselo al bot del colegio." },
  { icono: "ticket", titulo: "Inscríbete", texto: "Si hay cupo quedas confirmado; si no, entras a la lista de espera." },
  { icono: "bell", titulo: "Recibe avisos", texto: "Confirmación y recordatorios 24 h y 1 h antes, por correo y Telegram." },
];

const clave = (ev: EventoPublico) => `${ev.fecha}T${ev.hora || "00:00"}`;

// Abre el widget de @n8n/chat (WF10) pulsando su propio botón flotante.
function abrirChat() {
  document.querySelector<HTMLElement>(".chat-window-toggle")?.click();
}

function TicketHero({ evento, cargando }: { evento: EventoPublico | null; cargando: boolean }) {
  if (cargando) {
    return (
      <div className="w-full max-w-[400px] -rotate-2 rounded-[18px] bg-surface p-6 shadow-2xl shadow-black/25" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-8 w-4/5" />
        <Skeleton className="mt-6 h-4 w-3/5" />
        <Skeleton className="mt-3 h-4 w-2/3" />
        <Skeleton className="mt-6 h-1.5 w-full" />
      </div>
    );
  }
  if (!evento) return null;

  const cat = estiloCategoria(evento.categoria);
  const estado = estadoVisualEvento(evento);
  return (
    <div className="relative w-full max-w-[400px] pb-10">
      <Link
        href={`/eventos/${evento.evento_id}`}
        className="block -rotate-2 rounded-[18px] bg-surface text-ink shadow-2xl shadow-black/25 transition hover:rotate-0"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
              Próximo evento · {evento.categoria}
            </p>
            <p className="mt-2 font-display text-2xl font-bold leading-tight">{evento.nombre}</p>
          </div>
          <DateBadge fecha={evento.fecha} color={cat.color} className="shrink-0 border border-line" />
        </div>
        <div className="mx-6 border-t-2 border-dashed border-line" />
        <div className="space-y-2 p-6 pt-5 text-sm text-muted">
          <p className="flex items-start gap-2">
            <Icon name="clock" size={16} className="mt-0.5 shrink-0" />
            {fechaEvento(evento.fecha, evento.hora)}
          </p>
          <p className="flex items-start gap-2">
            <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
            {evento.lugar}
          </p>
          <div className="pt-2">
            <CapacityBar
              confirmados={evento.inscritos_confirmados}
              capacidad={evento.capacidad}
              disponibilidad={evento.disponibilidad}
              ultimos={estado === "ULTIMOS"}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold text-ink">{evento.cupos_disponibles}</span> de {evento.capacidad} cupos libres
              </span>
              <StatusBadge estado={estado} />
            </div>
          </div>
        </div>
      </Link>

      {/* Notificación ilustrativa del bot */}
      <div
        aria-hidden="true"
        className="absolute -bottom-1 right-0 flex max-w-[290px] rotate-1 items-start gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-ink shadow-xl shadow-black/20 sm:-right-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white">
          <Icon name="send" size={18} />
        </span>
        <span className="text-[13px] leading-snug">
          <span className="block font-bold">EventPass Bot</span>
          Recordatorio: «{evento.nombre}» es el {fechaEvento(evento.fecha, evento.hora)}.
        </span>
      </div>
    </div>
  );
}

export default function Inicio() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    listarEventos().then((res) => {
      if (!activo) return;
      if (res.ok) setEventos(res.data.eventos);
      else setError(res.error.message);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [intento]);

  // Primero los eventos abiertos (con cupo o lista de espera), luego el resto; cada grupo por fecha.
  const ordenados = useMemo(() => {
    const abierto = (ev: EventoPublico) => ev.disponibilidad === "DISPONIBLE" || ev.disponibilidad === "LLENO";
    return [...eventos].sort((a, b) => {
      if (abierto(a) !== abierto(b)) return abierto(a) ? -1 : 1;
      return clave(a).localeCompare(clave(b));
    });
  }, [eventos]);
  const proximo = ordenados.find((ev) => ev.disponibilidad === "DISPONIBLE" || ev.disponibilidad === "LLENO") ?? null;

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/eventos?q=${encodeURIComponent(q)}` : "/eventos");
  };

  return (
    <div className="-mt-8">
      {/* Hero a todo el ancho */}
      <section className="relative left-1/2 -ml-[50vw] w-screen bg-navy-deep text-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
              <Icon name="calendar" size={16} className="text-marigold" />
              Agenda escolar · Período 2026-II
            </span>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-[1.02] tracking-tight">
              Toda la vida del colegio, en una sola agenda.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Ferias de ciencia, torneos intercolegiales, escuelas de padres y muestras culturales. Inscríbete en
              segundos y recibe los avisos donde ya los lees.
            </p>

            <form onSubmit={buscar} role="search" className="mt-8 flex max-w-xl flex-col gap-2 rounded-[14px] bg-surface p-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Buscar eventos</span>
                <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Feria, torneo, robótica…"
                  className="min-h-12 w-full rounded-[10px] pl-11 pr-3 text-base text-ink placeholder:text-muted focus-visible:outline-navy"
                />
              </label>
              <button
                type="submit"
                className="min-h-12 rounded-[10px] bg-marigold px-6 text-base font-bold text-ink hover:brightness-95"
              >
                Buscar eventos
              </button>
            </form>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-white/90">
              {["Cupos en tiempo real", "Lista de espera automática", "Avisos por correo y Telegram"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name="check" size={18} className="text-marigold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <TicketHero evento={proximo} cargando={cargando} />
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="pt-14" aria-labelledby="titulo-categorias">
        <h2 id="titulo-categorias" className="font-display text-3xl font-bold tracking-tight text-ink">
          Explora por categoría
        </h2>
        <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
          {LISTA_CATEGORIAS.map((c) => {
            const e = CATEGORIAS[c];
            return (
              <Link
                key={c}
                href={`/eventos?categoria=${encodeURIComponent(c)}`}
                className="group flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-5 transition hover:border-input-border"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: e.tint, color: e.color }}
                >
                  <Icon name={e.icono} size={26} />
                </span>
                <span>
                  <span className="flex items-center gap-1 font-display text-lg font-bold text-ink">
                    {c}
                    <Icon name="arrowRight" size={16} className="text-muted transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{DESCRIPCION_CATEGORIA[c]}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Próximos eventos */}
      <section className="pt-14" aria-labelledby="titulo-proximos">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titulo-proximos" className="font-display text-3xl font-bold tracking-tight text-ink">
            Próximos eventos
          </h2>
          <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-navy hover:underline">
            Ver todos <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        <div className="mt-6">
          {cargando && <GridSkeleton cantidad={3} />}
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
          {!cargando && !error && ordenados.length === 0 && (
            <EmptyState titulo="Aún no hay eventos publicados">Vuelve pronto: el colegio publica nuevos eventos cada semana.</EmptyState>
          )}
          {!cargando && !error && ordenados.length > 0 && (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {ordenados.slice(0, 3).map((ev) => (
                <EventoCard key={ev.evento_id} evento={ev} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="pt-14" aria-labelledby="titulo-como">
        <h2 id="titulo-como" className="font-display text-3xl font-bold tracking-tight text-ink">
          Cómo funciona
        </h2>
        <ol className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="rounded-[16px] border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-lg font-bold text-white">
                  {i + 1}
                </span>
                <Icon name={p.icono} size={22} className="text-navy" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{p.titulo}</h3>
              <p className="mt-1 text-[15px] text-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Asistente */}
      <section className="pt-14">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] border border-[#F5D9A0] bg-marigold-soft p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-marigold text-ink">
              <Icon name="chat" size={24} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">¿Tienes dudas? Pregúntale al asistente</h2>
              <p className="mt-1 text-[15px] text-muted">
                Fechas, lugares, cupos, lista de espera o cómo vincular Telegram. Responde al instante.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirChat}
            className="min-h-12 rounded-[10px] bg-navy px-6 text-base font-bold text-white hover:bg-navy-deep"
          >
            Abrir el asistente
          </button>
        </div>
      </section>
    </div>
  );
}
