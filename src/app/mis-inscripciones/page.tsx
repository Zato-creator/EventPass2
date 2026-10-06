"use client";
// Mis inscripciones (WF06): listar, editar acreditación/observaciones y cancelar.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { EstadoInscripcion, InscripcionConEvento } from "@/types/api";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loading";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TelegramPill } from "@/components/ui/TelegramPill";
import { Toast } from "@/components/ui/Toast";
import { partesFecha } from "@/components/ui/DateBadge";
import { ESTADOS, estiloCategoria } from "@/components/ui/tokens";
import { useInscripciones } from "@/lib/hooks/useInscripciones";
import { listarEventos } from "@/lib/api/catalogo";
import { fechaHora } from "@/lib/fechas";

type Aviso = { tipo: "exito" | "error"; texto: string };
type Tab = "activas" | "historial";

const fmtHora = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const fmtSemana = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" });

const campo =
  "mt-1.5 w-full rounded-[10px] border border-input-border bg-surface px-3.5 text-[15px] font-normal text-ink";
const botonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold disabled:opacity-60";

function Fila({
  ins,
  categoria,
  actualizar,
  onPedirCancelar,
  onAviso,
}: {
  ins: InscripcionConEvento;
  categoria: string | undefined;
  actualizar: ReturnType<typeof useInscripciones>["actualizar"];
  onPedirCancelar: (ins: InscripcionConEvento) => void;
  onAviso: (a: Aviso) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(ins.nombre_acreditacion);
  const [obs, setObs] = useState(ins.observaciones);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cat = estiloCategoria(categoria ?? "");
  const fecha = partesFecha(ins.evento.fecha);
  const inicio = new Date(`${ins.evento.fecha}T${ins.evento.hora || "00:00"}:00-05:00`);
  const valida = !Number.isNaN(inicio.getTime());
  const activa = ins.estado !== "CANCELADA";

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setGuardando(true);
    setError(null);
    const res = await actualizar(ins.inscripcion_id, nombre, obs);
    setGuardando(false);
    if (res.ok) {
      setEditando(false);
      onAviso({ tipo: "exito", texto: "Cambios guardados." });
    } else setError(res.error.message);
  }

  return (
    <li className={`rounded-[16px] border border-line bg-surface p-4 sm:p-5 ${activa ? "" : "opacity-[0.82]"}`}>
      <div className="flex flex-wrap items-start gap-4">
        {/* Bloque de fecha con el tint de la categoría */}
        <div
          className="flex w-[72px] shrink-0 flex-col items-center rounded-[12px] py-2.5 leading-none"
          style={{ backgroundColor: cat.tint }}
        >
          <span className="text-[11px] font-bold tracking-wider" style={{ color: cat.color }}>
            {fecha?.mes ?? "—"}
          </span>
          <span className="mt-1 font-display text-3xl font-bold text-ink">{fecha?.dia ?? ""}</span>
          {valida && <span className="mt-1 text-[11px] font-semibold text-muted">{fmtSemana.format(inicio).replace(".", "")}</span>}
        </div>

        <div className="min-w-0 flex-[1_1_240px]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge estado={ins.estado} />
            {ins.estado === "LISTA_ESPERA" && ins.orden_espera ? (
              <span className="text-sm font-semibold text-espera-fg">Tu turno: {ins.orden_espera}</span>
            ) : null}
            {ins.evento.estado !== "PUBLICADO" && (
              <span className="text-sm font-semibold text-muted">
                Evento {ins.evento.estado === "CANCELADO" ? "cancelado" : "cerrado"}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-display text-xl font-bold leading-tight text-ink">{ins.evento.nombre}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={15} /> {valida ? fmtHora.format(inicio) : ins.evento.hora}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={15} /> {ins.evento.lugar}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="user" size={15} /> {ins.nombre_acreditacion || "—"}
            </span>
          </p>
          {ins.observaciones && !editando && (
            <p className="mt-1 text-sm text-muted">
              <span className="font-semibold text-ink">Observaciones:</span> {ins.observaciones}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Inscrito el {fechaHora(ins.fecha_inscripcion)}
            {ins.fecha_actualizacion && ins.fecha_actualizacion !== ins.fecha_inscripcion
              ? ` · actualizado el ${fechaHora(ins.fecha_actualizacion)}`
              : ""}
          </p>
        </div>

        {!editando && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-stretch">
            {activa && (
              <>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className={`${botonBase} border border-input-border text-ink hover:bg-ground`}
                >
                  <Icon name="edit" size={16} /> Editar datos
                </button>
                <button
                  type="button"
                  onClick={() => onPedirCancelar(ins)}
                  className={`${botonBase} border border-[#DC2626] text-[#B91C1C] hover:bg-cancelado-bg`}
                >
                  <Icon name="x" size={16} /> Cancelar
                </button>
              </>
            )}
            <Link href={`/eventos/${ins.evento_id}`} className={`${botonBase} text-navy hover:bg-ground`}>
              Ver evento <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tipo="error">{error}</Alert>
        </div>
      )}

      {editando && (
        <form onSubmit={guardar} className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="block text-sm font-semibold text-ink">
            Nombre para la acreditación
            <input
              required
              minLength={3}
              maxLength={120}
              value={nombre}
              onChange={(x) => setNombre(x.target.value)}
              className={`${campo} min-h-11`}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Observaciones
            <textarea
              maxLength={300}
              rows={2}
              value={obs}
              onChange={(x) => setObs(x.target.value)}
              className={`${campo} py-2.5`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button disabled={guardando} className={`${botonBase} bg-navy text-white hover:bg-navy-deep`}>
              {guardando && <Spinner className="h-4 w-4" />}
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setEditando(false);
                setError(null);
                setNombre(ins.nombre_acreditacion);
                setObs(ins.observaciones);
              }}
              className={`${botonBase} border border-input-border text-ink hover:bg-ground`}
            >
              Descartar
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function Resumen({ estado, cantidad }: { estado: EstadoInscripcion; cantidad: number }) {
  const e = ESTADOS[estado];
  return (
    <div className="rounded-[16px] border border-line bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.fg }} />
        {estado === "LISTA_ESPERA" ? "En lista de espera" : estado === "CONFIRMADA" ? "Confirmadas" : "Canceladas"}
      </p>
      <p className="mt-2 font-display text-4xl font-extrabold text-ink">{cantidad}</p>
    </div>
  );
}

function ListaSkeleton() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Cargando tus inscripciones…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-4 rounded-[16px] border border-line bg-surface p-5">
          <Skeleton className="h-20 w-[72px]" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Contenido() {
  const { inscripciones, cargando, error, recargar, actualizar, cancelar } = useInscripciones();
  const [tab, setTab] = useState<Tab>("activas");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [porCancelar, setPorCancelar] = useState<InscripcionConEvento | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [categorias, setCategorias] = useState<Record<string, string>>({});

  // La inscripción no trae la categoría: se toma del catálogo público solo para el color.
  useEffect(() => {
    listarEventos().then((res) => {
      if (res.ok) setCategorias(Object.fromEntries(res.data.eventos.map((ev) => [ev.evento_id, ev.categoria])));
    });
  }, []);

  const cerrarAviso = useCallback(() => setAviso(null), []);
  const cerrarModal = useCallback(() => setPorCancelar(null), []);

  async function confirmarCancelacion() {
    if (!porCancelar) return;
    setCancelando(true);
    const res = await cancelar(porCancelar.inscripcion_id);
    setCancelando(false);
    if (res.ok) {
      setAviso({ tipo: "exito", texto: `Cancelaste tu inscripción a "${porCancelar.evento.nombre}". Te enviamos la confirmación por correo y Telegram.` });
      setPorCancelar(null);
    } else {
      setAviso({ tipo: "error", texto: res.error.message });
      setPorCancelar(null);
    }
  }

  const cuenta = (e: EstadoInscripcion) => inscripciones.filter((i) => i.estado === e).length;
  const activas = inscripciones.filter((i) => i.estado !== "CANCELADA");
  const historial = inscripciones.filter((i) => i.estado === "CANCELADA");
  const visibles = tab === "activas" ? activas : historial;

  if (cargando && inscripciones.length === 0) return <ListaSkeleton />;
  if (error)
    return (
      <Alert
        tipo="error"
        titulo="No pudimos cargar tus inscripciones"
        accion={
          <button
            type="button"
            onClick={recargar}
            className="min-h-11 rounded-[10px] border border-cancelado-fg px-4 text-sm font-bold text-cancelado-fg hover:bg-white/60"
          >
            Reintentar
          </button>
        }
      >
        {error}
      </Alert>
    );

  const tabClase = (t: Tab) =>
    `inline-flex min-h-11 items-center gap-2 border-b-2 px-1 text-[15px] font-bold ${
      tab === t ? "border-marigold text-ink" : "border-transparent text-muted hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
        <Resumen estado="CONFIRMADA" cantidad={cuenta("CONFIRMADA")} />
        <Resumen estado="LISTA_ESPERA" cantidad={cuenta("LISTA_ESPERA")} />
        <Resumen estado="CANCELADA" cantidad={cuenta("CANCELADA")} />
      </div>

      <div role="tablist" aria-label="Inscripciones" className="flex gap-6 border-b border-line">
        <button role="tab" type="button" aria-selected={tab === "activas"} onClick={() => setTab("activas")} className={tabClase("activas")}>
          Activas <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{activas.length}</span>
        </button>
        <button role="tab" type="button" aria-selected={tab === "historial"} onClick={() => setTab("historial")} className={tabClase("historial")}>
          Historial <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{historial.length}</span>
        </button>
      </div>

      <div role="tabpanel" aria-busy={cargando}>
        {visibles.length === 0 ? (
          <EmptyState
            icono="ticket"
            titulo={tab === "activas" ? "Aún no tienes inscripciones activas" : "Sin inscripciones canceladas"}
            accion={
              tab === "activas" && (
                <Link
                  href="/eventos"
                  className="inline-flex min-h-11 items-center rounded-[10px] bg-navy px-5 text-[15px] font-bold text-white hover:bg-navy-deep"
                >
                  Explorar eventos
                </Link>
              )
            }
          >
            {tab === "activas"
              ? "Cuando te inscribas a un evento lo verás aquí, con su estado y tu turno si estás en lista de espera."
              : "Aquí aparecerán las inscripciones que canceles."}
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {visibles.map((i) => (
              <Fila
                key={i.inscripcion_id}
                ins={i}
                categoria={categorias[i.evento_id]}
                actualizar={actualizar}
                onPedirCancelar={setPorCancelar}
                onAviso={setAviso}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        abierto={porCancelar !== null}
        titulo="¿Cancelar tu inscripción?"
        textoConfirmar={cancelando ? "Cancelando…" : "Sí, cancelar"}
        textoCancelar="No, mantener"
        peligro
        ocupado={cancelando}
        onConfirmar={confirmarCancelacion}
        onCerrar={cerrarModal}
      >
        Vas a cancelar tu inscripción a <strong className="text-ink">{porCancelar?.evento.nombre}</strong>. Tu cupo quedará libre
        para otra persona y te avisaremos por correo y Telegram.
      </ConfirmDialog>

      <Toast tipo={aviso?.tipo ?? "exito"} mensaje={aviso?.texto ?? null} onCerrar={cerrarAviso} duracionMs={6000} />
    </div>
  );
}

export default function MisInscripcionesPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Mis inscripciones</h1>
            <p className="mt-1 text-[15px] text-muted">Tus eventos, su estado y tu turno en la lista de espera.</p>
          </div>
          <TelegramPill textoSinVincular="Vincular Telegram" />
        </div>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
