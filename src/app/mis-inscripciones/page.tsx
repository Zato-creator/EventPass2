"use client";
// Mis inscripciones (WF06): listar, editar acreditación/observaciones y cancelar.
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { EstadoInscripcion, InscripcionConEvento } from "@/types/api";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";
import { useInscripciones } from "@/lib/hooks/useInscripciones";
import { fechaEvento, fechaHora } from "@/lib/fechas";

const estilos: Record<EstadoInscripcion, { texto: string; clase: string }> = {
  CONFIRMADA: { texto: "Confirmada", clase: "bg-green-100 text-green-800" },
  LISTA_ESPERA: { texto: "Lista de espera", clase: "bg-amber-100 text-amber-800" },
  CANCELADA: { texto: "Cancelada", clase: "bg-slate-200 text-slate-600" },
};

type Mensaje = { tipo: "exito" | "error"; texto: string };

function Tarjeta({
  ins,
  actualizar,
  cancelar,
  onCancelada,
}: {
  ins: InscripcionConEvento;
  onCancelada: (texto: string) => void;
  actualizar: ReturnType<typeof useInscripciones>["actualizar"];
  cancelar: ReturnType<typeof useInscripciones>["cancelar"];
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(ins.nombre_acreditacion);
  const [obs, setObs] = useState(ins.observaciones);
  const [ocupado, setOcupado] = useState<"guardar" | "cancelar" | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const e = estilos[ins.estado];
  const activa = ins.estado !== "CANCELADA";

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setOcupado("guardar");
    setMensaje(null);
    const res = await actualizar(ins.inscripcion_id, nombre, obs);
    setOcupado(null);
    if (res.ok) {
      setEditando(false);
      setMensaje({ tipo: "exito", texto: "Cambios guardados." });
    } else setMensaje({ tipo: "error", texto: res.error.message });
  }

  async function onCancelar() {
    if (!window.confirm(`¿Cancelar tu inscripción a "${ins.evento.nombre}"? Tu cupo quedará libre para otra persona.`)) return;
    setOcupado("cancelar");
    setMensaje(null);
    const res = await cancelar(ins.inscripcion_id);
    setOcupado(null);
    if (res.ok) onCancelada(`Cancelaste tu inscripción a "${ins.evento.nombre}". Te enviamos la confirmación por correo y Telegram.`);
    else setMensaje({ tipo: "error", texto: res.error.message });
  }

  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/eventos/${ins.evento_id}`} className="text-lg font-bold hover:underline">
            {ins.evento.nombre}
          </Link>
          <p className="text-sm text-slate-600">
            📅 {fechaEvento(ins.evento.fecha, ins.evento.hora)} · 📍 {ins.evento.lugar}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${e.clase}`}>
          {e.texto}
          {ins.estado === "LISTA_ESPERA" && ins.orden_espera ? ` · posición ${ins.orden_espera}` : ""}
        </span>
      </div>

      {mensaje && <Alert tipo={mensaje.tipo}>{mensaje.texto}</Alert>}

      {editando ? (
        <form onSubmit={guardar} className="space-y-2">
          <label className="block text-sm font-medium">
            Nombre para la acreditación
            <input required minLength={3} maxLength={120} value={nombre} onChange={(x) => setNombre(x.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
          <label className="block text-sm font-medium">
            Observaciones
            <textarea maxLength={300} rows={2} value={obs} onChange={(x) => setObs(x.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
          <div className="flex gap-2">
            <button disabled={ocupado !== null} className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {ocupado === "guardar" ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => { setEditando(false); setNombre(ins.nombre_acreditacion); setObs(ins.observaciones); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Descartar
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <div><dt className="inline font-medium">Acreditación: </dt><dd className="inline">{ins.nombre_acreditacion || "—"}</dd></div>
          <div><dt className="inline font-medium">Observaciones: </dt><dd className="inline">{ins.observaciones || "—"}</dd></div>
          <div><dt className="inline font-medium">Inscrito: </dt><dd className="inline">{fechaHora(ins.fecha_inscripcion)}</dd></div>
          <div><dt className="inline font-medium">Actualizado: </dt><dd className="inline">{fechaHora(ins.fecha_actualizacion)}</dd></div>
        </dl>
      )}

      {activa && !editando && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditando(true)} disabled={ocupado !== null}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60">
            Editar datos
          </button>
          <button onClick={onCancelar} disabled={ocupado !== null}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60">
            {ocupado === "cancelar" ? "Cancelando…" : "Cancelar inscripción"}
          </button>
        </div>
      )}
    </li>
  );
}

function Contenido() {
  const { inscripciones, cargando, error, recargar, actualizar, cancelar } = useInscripciones();
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const visibles = verCanceladas ? inscripciones : inscripciones.filter((i) => i.estado !== "CANCELADA");
  const canceladas = inscripciones.length - inscripciones.filter((i) => i.estado !== "CANCELADA").length;

  if (cargando && inscripciones.length === 0) return <Loading texto="Cargando tus inscripciones…" />;
  if (error)
    return (
      <Alert tipo="error">
        {error}{" "}
        <button onClick={recargar} className="font-semibold underline">Reintentar</button>
      </Alert>
    );

  return (
    <div className="space-y-4">
      {aviso && <Alert tipo="exito">{aviso}</Alert>}
      {canceladas > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} />
          Mostrar canceladas ({canceladas})
        </label>
      )}
      {visibles.length === 0 ? (
        <Alert tipo="info">
          Aún no tienes inscripciones activas. <Link href="/eventos" className="font-semibold underline">Explora los eventos</Link>.
        </Alert>
      ) : (
        <ul className="space-y-4">
          {visibles.map((i) => (
            <Tarjeta key={i.inscripcion_id} ins={i} actualizar={actualizar} cancelar={cancelar} onCancelada={setAviso} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MisInscripcionesPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Mis inscripciones</h1>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
