"use client";
// Inscripción a un evento (WF06 · crear). El estado resultante (CONFIRMADA / LISTA_ESPERA) lo decide n8n.
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { EventoPublico, Inscripcion } from "@/types/api";
import { crearInscripcion } from "@/lib/api/inscripciones";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "./ui/Alert";

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
  if (!abierto) {
    return (
      <Alert tipo="info">
        Este evento está {evento.disponibilidad === "CANCELADO" ? "cancelado" : "cerrado"} y no recibe inscripciones.
      </Alert>
    );
  }

  if (!usuario) {
    return (
      <Alert tipo="info">
        Para inscribirte <Link href="/login" className="font-semibold underline">inicia sesión</Link> o{" "}
        <Link href="/registro" className="font-semibold underline">crea una cuenta</Link>.
      </Alert>
    );
  }

  if (resultado) {
    const confirmada = resultado.inscripcion.estado === "CONFIRMADA";
    return (
      <Alert tipo={confirmada ? "exito" : "info"}>
        <p className="font-semibold">{resultado.mensaje}</p>
        <p className="mt-1 text-sm">
          Te enviamos la confirmación por correo y Telegram. Puedes verla en{" "}
          <Link href="/mis-inscripciones" className="font-semibold underline">Mis inscripciones</Link>.
        </p>
      </Alert>
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
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Inscribirme</h2>
      {evento.disponibilidad === "LLENO" && (
        <Alert tipo="info">El evento está lleno: si te inscribes quedarás en lista de espera y te avisaremos si se libera un cupo.</Alert>
      )}
      {error && (
        <Alert tipo="error">
          {error.message}
          {error.code === "TELEGRAM_NO_VINCULADO" && (
            <>
              {" "}
              <Link href="/telegram" className="font-semibold underline">Vincular Telegram ahora</Link>
            </>
          )}
        </Alert>
      )}
      <label className="block text-sm font-medium">
        Nombre para la acreditación
        <input
          required
          minLength={3}
          maxLength={120}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Laura Gómez — Colegio San Pedro"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-medium">
        Observaciones (opcional)
        <textarea
          maxLength={300}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej.: Acudiente de 7°B"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          rows={2}
        />
      </label>
      <button disabled={enviando} className="w-full rounded-lg bg-marca py-2 font-semibold text-white disabled:opacity-60">
        {enviando ? "Inscribiendo…" : evento.disponibilidad === "LLENO" ? "Unirme a la lista de espera" : "Confirmar inscripción"}
      </button>
    </form>
  );
}
