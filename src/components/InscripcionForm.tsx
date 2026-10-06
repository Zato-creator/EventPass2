"use client";
// Inscripción a un evento (WF06 · crear). El estado resultante (CONFIRMADA / LISTA_ESPERA) lo decide n8n.
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { EventoPublico, Inscripcion } from "@/types/api";
import { crearInscripcion } from "@/lib/api/inscripciones";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "./ui/Alert";
import { Icon } from "./ui/Icon";
import { Spinner } from "./ui/Loading";
import { TelegramPill } from "./ui/TelegramPill";

const campo =
  "mt-1.5 w-full rounded-[10px] border border-input-border bg-surface px-3.5 text-[15px] font-normal text-ink placeholder:text-muted";

function Resultado({ inscripcion, mensaje }: { inscripcion: Inscripcion; mensaje: string }) {
  const confirmada = inscripcion.estado === "CONFIRMADA";
  return (
    <div
      role="status"
      className={`rounded-[14px] border p-5 ${confirmada ? "border-[#86EFAC] bg-ok-bg text-ok-fg" : "border-[#FCD34D] bg-espera-bg text-espera-fg"}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${confirmada ? "bg-[#16A34A] text-white" : "bg-marigold text-ink"}`}
      >
        <Icon name={confirmada ? "check" : "clock"} size={22} />
      </span>
      <p className="mt-3 font-display text-xl font-bold">
        {confirmada
          ? "¡Inscripción confirmada!"
          : `Estás en lista de espera${inscripcion.orden_espera ? ` — turno ${inscripcion.orden_espera}` : ""}`}
      </p>
      <p className="mt-1 text-[15px]">{mensaje}</p>
      <p className="mt-3 text-sm">
        {confirmada
          ? "Te enviamos la confirmación por correo y Telegram."
          : "Si se libera un cupo te pasamos a confirmada y te avisamos por correo y Telegram."}
      </p>
      <Link
        href="/mis-inscripciones"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-surface px-4 text-[15px] font-bold text-ink hover:bg-ground"
      >
        Ver mis inscripciones
      </Link>
    </div>
  );
}

export function InscripcionForm({ evento, onInscrito }: { evento: EventoPublico; onInscrito?: () => void }) {
  const { usuario } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [resultado, setResultado] = useState<{ inscripcion: Inscripcion; mensaje: string } | null>(null);

  // La sesión se restaura de forma asíncrona: precargar el nombre cuando llegue.
  useEffect(() => {
    if (usuario) setNombre((n) => n || usuario.nombre);
  }, [usuario]);

  const abierto = evento.disponibilidad === "DISPONIBLE" || evento.disponibilidad === "LLENO";
  const lleno = evento.disponibilidad === "LLENO";

  let contenido: React.ReactNode;
  if (!abierto) {
    contenido = (
      <Alert tipo="info" titulo={evento.disponibilidad === "CANCELADO" ? "Evento cancelado" : "Inscripciones cerradas"}>
        Este evento está {evento.disponibilidad === "CANCELADO" ? "cancelado" : "cerrado"} y no recibe inscripciones.
      </Alert>
    );
  } else if (!usuario) {
    contenido = (
      <div className="space-y-3">
        <p className="text-[15px] text-muted">Para inscribirte necesitas una cuenta con Telegram vinculado.</p>
        <Link
          href="/login"
          className="flex min-h-12 items-center justify-center rounded-[10px] bg-navy px-4 text-base font-bold text-white hover:bg-navy-deep"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="flex min-h-12 items-center justify-center rounded-[10px] border border-input-border px-4 text-base font-bold text-ink hover:bg-ground"
        >
          Crear cuenta
        </Link>
      </div>
    );
  } else if (resultado) {
    contenido = <Resultado inscripcion={resultado.inscripcion} mensaje={resultado.mensaje} />;
  } else {
    contenido = (
      <form onSubmit={onSubmit} className="space-y-4">
        <TelegramPill />
        {lleno && (
          <Alert tipo="info">
            El evento está lleno: si te inscribes quedarás en lista de espera y te avisaremos si se libera un cupo.
          </Alert>
        )}
        {error && (
          <Alert tipo="error">
            {error.message}
            {error.code === "TELEGRAM_NO_VINCULADO" && (
              <>
                {" "}
                <Link href="/telegram" className="font-semibold underline">
                  Vincular Telegram ahora
                </Link>
              </>
            )}
          </Alert>
        )}
        <label className="block text-sm font-semibold text-ink">
          Nombre para la acreditación
          <input
            required
            minLength={3}
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Laura Gómez — Colegio San Pedro"
            className={`${campo} min-h-12`}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Observaciones <span className="font-normal text-muted">(opcional)</span>
          <textarea
            maxLength={300}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej.: Acudiente de 7°B"
            className={`${campo} py-2.5`}
            rows={3}
          />
        </label>
        <button
          disabled={enviando}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] px-4 text-base font-bold disabled:opacity-60 ${
            lleno ? "bg-marigold text-ink hover:brightness-95" : "bg-navy text-white hover:bg-navy-deep"
          }`}
        >
          {enviando && <Spinner className="h-5 w-5" />}
          {enviando ? "Inscribiendo…" : lleno ? "Unirme a la lista de espera" : "Confirmar inscripción"}
        </button>
      </form>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await crearInscripcion({
      evento_id: evento.evento_id,
      nombre_acreditacion: nombre,
      observaciones,
    });
    setEnviando(false);
    if (res.ok) {
      setResultado(res.data);
      onInscrito?.();
    } else setError(res.error);
  }

  return (
    <section
      aria-labelledby="titulo-inscripcion"
      className="rounded-[18px] border border-line bg-surface p-6 shadow-xl shadow-ink/[0.07]"
    >
      <h2 id="titulo-inscripcion" className="mb-4 font-display text-2xl font-bold text-ink">
        {lleno && !resultado ? "Lista de espera" : "Inscripción"}
      </h2>
      {contenido}
    </section>
  );
}
