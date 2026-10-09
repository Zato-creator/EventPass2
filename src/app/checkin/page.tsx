"use client";
// Check-in digital (WF12): registra el ingreso de una inscripción CONFIRMADA a su evento.
// Solo presentación: todas las validaciones (existencia, pertenencia, duplicado, estado) las hace n8n.
import { useEffect, useState, type FormEvent } from "react";
import type { CheckinData, EventoPublico, ResultadoCheckin } from "@/types/api";
import { registrarCheckin } from "@/lib/api/checkin";
import { listarEventos } from "@/lib/api/catalogo";
import { fechaEvento, fechaHora } from "@/lib/fechas";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Alert } from "@/components/ui/Alert";
import { Campo, botonPrimario } from "@/components/ui/Campo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loading";

type Resultado = { resultado: ResultadoCheckin; mensaje: string; data?: CheckinData };

const ESTILOS: Record<ResultadoCheckin, { clase: string; icono: IconName; titulo: string }> = {
  EXITOSO: { clase: "border-[#86EFAC] bg-ok-bg text-ok-fg", icono: "check", titulo: "Ingreso registrado" },
  DUPLICADO: { clase: "border-[#FCD34D] bg-espera-bg text-espera-fg", icono: "alert", titulo: "Ingreso duplicado" },
  RECHAZADO: { clase: "border-[#FCA5A5] bg-cancelado-bg text-cancelado-fg", icono: "x", titulo: "Ingreso rechazado" },
};

function TarjetaResultado({ r }: { r: Resultado }) {
  const e = ESTILOS[r.resultado];
  return (
    <div role={r.resultado === "EXITOSO" ? "status" : "alert"} className={`rounded-[16px] border p-5 ${e.clase}`}>
      <div className="flex items-start gap-3">
        <Icon name={e.icono} size={24} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide">{r.resultado}</p>
          <p className="font-display text-xl font-bold">{e.titulo}</p>
          <p className="mt-1 text-[15px]">{r.mensaje}</p>
          {r.data && (
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              {r.resultado === "EXITOSO" && (
                <>
                  <dt className="font-semibold">Check-in</dt>
                  <dd className="break-all font-mono">{r.data.checkin_id}</dd>
                  <dt className="font-semibold">Hora de ingreso</dt>
                  <dd>{fechaHora(r.data.fecha_checkin)}</dd>
                </>
              )}
              <dt className="font-semibold">Inscripción</dt>
              <dd className="break-all font-mono">{r.data.inscripcion_id || "—"}</dd>
              <dt className="font-semibold">Evento</dt>
              <dd className="break-all font-mono">{r.data.evento_id || "—"}</dd>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function Contenido() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [inscripcionId, setInscripcionId] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorRed, setErrorRed] = useState<string | null>(null);

  // Sugerencias de eventos desde el catálogo (WF05). Si falla, el ID se escribe a mano.
  useEffect(() => {
    let vigente = true;
    listarEventos().then((res) => {
      if (vigente && res.ok) setEventos(res.data.eventos);
    });
    return () => {
      vigente = false;
    };
  }, []);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setResultado(null);
    setErrorRed(null);
    const res = await registrarCheckin({ inscripcion_id: inscripcionId.trim(), evento_id: eventoId.trim() });
    setEnviando(false);
    if (res.ok) {
      setResultado({ resultado: res.data.resultado, mensaje: res.data.mensaje, data: res.data });
    } else if (res.error.code === "DUPLICADO" || res.error.code === "RECHAZADO") {
      setResultado({ resultado: res.error.code, mensaje: res.error.message, data: res.data });
    } else {
      setErrorRed(res.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={enviar} className="space-y-5 rounded-[16px] border border-line bg-surface p-6">
        <Campo
          etiqueta="ID de inscripción"
          placeholder="INS-20261009083015-1A2B"
          value={inscripcionId}
          onChange={(e) => setInscripcionId(e.target.value)}
          autoComplete="off"
          required
        />
        <Campo
          etiqueta="ID de evento"
          placeholder="EVT-001"
          list="eventos-checkin"
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          autoComplete="off"
          ayuda="Elige un evento de la lista o escribe su ID."
          required
        />
        <datalist id="eventos-checkin">
          {eventos.map((e) => (
            <option key={e.evento_id} value={e.evento_id}>
              {e.nombre} · {fechaEvento(e.fecha, e.hora)}
            </option>
          ))}
        </datalist>
        <button type="submit" className={botonPrimario} disabled={enviando}>
          {enviando ? <Spinner /> : <Icon name="ticket" size={20} />}
          {enviando ? "Registrando…" : "Registrar ingreso"}
        </button>
      </form>

      {errorRed && (
        <Alert tipo="error" titulo="No se pudo registrar el ingreso">
          {errorRed}
        </Alert>
      )}
      {resultado && <TarjetaResultado r={resultado} />}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Check-in</h1>
          <p className="mt-2 text-muted">Registra el ingreso de un asistente con su inscripción confirmada.</p>
        </div>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
