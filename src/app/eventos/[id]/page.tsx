"use client";
// Detalle de evento (WF05) + inscripción (WF06).
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { EventoPublico } from "@/types/api";
import { detalleEvento } from "@/lib/api/catalogo";
import { fechaEvento } from "@/lib/fechas";
import { Alert } from "@/components/ui/Alert";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { estadoVisualEvento, estiloCategoria } from "@/components/ui/tokens";
import { PortadaEvento } from "@/components/EventoCard";
import { InscripcionForm } from "@/components/InscripcionForm";

const ZONA = "America/Bogota";
const fmtDia = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtHora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });
const fmtIso = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

// "Es hoy" / "Es mañana" según el calendario de Bogotá (solo una etiqueta visual).
function cercania(fecha: string): string | null {
  const hoy = fmtIso.format(new Date());
  const manana = fmtIso.format(new Date(Date.now() + 86_400_000));
  if (fecha === hoy) return "Es hoy";
  if (fecha === manana) return "Es mañana";
  return null;
}

function Dato({ icono, etiqueta, valor }: { icono: IconName; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-ground text-navy">
        <Icon name={icono} size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{etiqueta}</p>
        <p className="mt-0.5 font-semibold text-ink first-letter:uppercase">{valor || "—"}</p>
      </div>
    </div>
  );
}

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold";

function DetalleSkeleton() {
  return (
    <div role="status" className="-mt-8">
      <span className="sr-only">Cargando evento…</span>
      <div className="relative left-1/2 -ml-[50vw] w-screen bg-line/60">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-6 w-48" />
          <Skeleton className="mt-4 h-10 w-3/4" />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-8">
        <div className="min-w-0 flex-[1_1_560px] space-y-4">
          <Skeleton className="h-56 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
        <Skeleton className="h-80 flex-[1_1_340px]" />
      </div>
    </div>
  );
}

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

  if (cargando) return <DetalleSkeleton />;
  if (error || !evento)
    return (
      <div className="space-y-4">
        <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-navy hover:underline">
          <Icon name="arrowLeft" size={18} /> Volver al catálogo
        </Link>
        <Alert
          tipo="error"
          titulo="No pudimos cargar el evento"
          accion={
            <button
              type="button"
              onClick={() => cargar()}
              className="min-h-11 rounded-[10px] border border-cancelado-fg px-4 text-sm font-bold text-cancelado-fg hover:bg-white/60"
            >
              Reintentar
            </button>
          }
        >
          {error ?? "Evento no encontrado."}
        </Alert>
      </div>
    );

  const cat = estiloCategoria(evento.categoria);
  const estado = estadoVisualEvento(evento);
  const cuando = cercania(evento.fecha);
  const inicio = new Date(`${evento.fecha}T${evento.hora || "00:00"}:00-05:00`);
  const fechaValida = !Number.isNaN(inicio.getTime());
  const inactivo = evento.disponibilidad === "CERRADO" || evento.disponibilidad === "CANCELADO";

  return (
    <article className="-mt-8">
      {/* Franja superior con el tint de la categoría */}
      <header className="relative left-1/2 -ml-[50vw] w-screen" style={{ backgroundColor: cat.tint }}>
        <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-6">
          <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink hover:underline">
            <Icon name="arrowLeft" size={18} /> Volver al catálogo
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`${pill} bg-surface`} style={{ color: cat.color }}>
              <Icon name={cat.icono} size={14} /> {evento.categoria}
            </span>
            <StatusBadge estado={estado} />
            {cuando && !inactivo && (
              <span className={`${pill} bg-marigold text-ink`}>
                <Icon name="clock" size={14} /> {cuando}
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            {evento.nombre}
          </h1>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-start gap-8">
        {/* Columna de información */}
        <div className="min-w-0 flex-[1_1_560px] space-y-8">
          <div className="overflow-hidden rounded-[16px] border border-line">
            <PortadaEvento evento={evento} alto="h-56 sm:h-72" />
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            <Dato icono="calendar" etiqueta="Fecha" valor={fechaValida ? fmtDia.format(inicio) : evento.fecha} />
            <Dato icono="clock" etiqueta="Hora" valor={fechaValida ? fmtHora.format(inicio) : evento.hora} />
            <Dato icono="pin" etiqueta="Lugar" valor={evento.lugar} />
            <Dato icono="users" etiqueta="Organiza" valor={evento.organizador} />
          </div>

          <section aria-labelledby="titulo-sobre">
            <h2 id="titulo-sobre" className="font-display text-2xl font-bold text-ink">
              Sobre el evento
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted">
              {evento.descripcion || "El organizador aún no ha agregado una descripción."}
            </p>
          </section>

          <section aria-labelledby="titulo-disponibilidad" className="rounded-[16px] border border-line bg-surface p-6">
            <h2 id="titulo-disponibilidad" className="font-display text-2xl font-bold text-ink">
              Disponibilidad
            </h2>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <p>
                <span className="font-display text-5xl font-extrabold leading-none text-ink">
                  {inactivo ? 0 : evento.cupos_disponibles}
                </span>
                <span className="ml-2 text-base text-muted">de {evento.capacidad} cupos libres</span>
              </p>
              <StatusBadge estado={estado} />
            </div>
            <div className="mt-4">
              <CapacityBar
                confirmados={evento.inscritos_confirmados}
                capacidad={evento.capacidad}
                disponibilidad={evento.disponibilidad}
                ultimos={estado === "ULTIMOS"}
                alto={12}
              />
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-navy" />
                <dt className="text-muted">Confirmados</dt>
                <dd className="font-bold text-ink">{evento.inscritos_confirmados}</dd>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-marigold" />
                <dt className="text-muted">En lista de espera</dt>
                <dd className="font-bold text-ink">{evento.en_lista_espera}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="titulo-saber">
            <h2 id="titulo-saber" className="font-display text-2xl font-bold text-ink">
              Bueno saber
            </h2>
            <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
              {(
                [
                  { icono: "mail", texto: "Recibes la confirmación por correo y Telegram." },
                  { icono: "bell", texto: "Te recordamos el evento 24 horas y 1 hora antes." },
                  { icono: "x", texto: "Puedes cancelar desde Mis inscripciones y liberar tu cupo." },
                ] as { icono: IconName; texto: string }[]
              ).map((b) => (
                <li key={b.texto} className="flex items-start gap-3 rounded-[14px] bg-surface p-4 text-[15px] text-ink ring-1 ring-line">
                  <Icon name={b.icono} size={20} className="mt-0.5 shrink-0 text-navy" />
                  {b.texto}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Panel de inscripción */}
        <aside className="w-full min-w-0 flex-[1_1_340px] lg:sticky lg:top-6 lg:max-w-[400px]">
          <InscripcionForm evento={evento} onInscrito={() => cargar(true)} />
          <p className="mt-3 px-1 text-sm text-muted">{fechaEvento(evento.fecha, evento.hora)}</p>
        </aside>
      </div>
    </article>
  );
}
