"use client";
// Vincular Telegram (WF03): estado, generar código temporal e instrucciones /vincular CODIGO.
import { useCallback, useEffect, useState } from "react";
import type { CodigoVinculacion, EstadoTelegram } from "@/types/api";
import { estadoTelegram, generarCodigo } from "@/lib/api/telegram";
import { fechaHora } from "@/lib/fechas";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";

function Contenido() {
  const [estado, setEstado] = useState<EstadoTelegram | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<CodigoVinculacion | null>(null);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const consultar = useCallback(async (inicial = false) => {
    if (inicial) setCargando(true);
    else setVerificando(true);
    const res = await estadoTelegram();
    if (res.ok) {
      setEstado(res.data);
      setError(null);
      if (res.data.vinculado) setCodigo(null);
    } else setError(res.error.message);
    setCargando(false);
    setVerificando(false);
  }, []);

  useEffect(() => {
    consultar(true);
  }, [consultar]);

  // Mientras hay un código pendiente, se consulta el estado cada 5 s para detectar la vinculación.
  useEffect(() => {
    if (!codigo) return;
    const t = setInterval(() => consultar(), 5000);
    return () => clearInterval(t);
  }, [codigo, consultar]);

  async function generar() {
    setGenerando(true);
    setError(null);
    setCopiado(false);
    const res = await generarCodigo();
    setGenerando(false);
    if (res.ok) setCodigo(res.data);
    else setError(res.error.message);
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  if (cargando) return <Loading texto="Consultando tu vinculación…" />;

  if (estado?.vinculado)
    return (
      <Alert tipo="exito">
        <p className="font-semibold">✅ Tu cuenta está vinculada a Telegram{estado.telegram_username ? ` (@${estado.telegram_username})` : ""}.</p>
        {estado.fecha_vinculacion && <p className="mt-1 text-sm">Desde el {fechaHora(estado.fecha_vinculacion)}.</p>}
        <p className="mt-1 text-sm">Recibirás confirmaciones, avisos de lista de espera y recordatorios por correo y Telegram.</p>
      </Alert>
    );

  const bot = codigo?.bot_username || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

  return (
    <div className="space-y-5">
      {error && <Alert tipo="error">{error}</Alert>}
      <Alert tipo="info">
        Vincular Telegram es obligatorio para inscribirte a eventos. Así te llegan los avisos también por chat.
      </Alert>

      {!codigo ? (
        <button onClick={generar} disabled={generando}
          className="rounded-lg bg-marca px-5 py-3 font-semibold text-white disabled:opacity-60">
          {generando ? "Generando código…" : "Generar código de vinculación"}
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Tu código (válido hasta {fechaHora(codigo.expira_en)}):</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-marca">{codigo.codigo}</p>
          <ol className="list-decimal space-y-2 pl-5 text-slate-700">
            <li>
              Abre el bot{" "}
              {bot ? (
                <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer" className="font-semibold text-marca underline">@{bot}</a>
              ) : (
                "de EventPass"
              )}{" "}
              en Telegram y pulsa <strong>Iniciar</strong>.
            </li>
            <li>
              Envíale este mensaje:{" "}
              <code className="rounded bg-slate-100 px-2 py-1 font-mono">{codigo.instruccion}</code>{" "}
              <button onClick={() => copiar(codigo.instruccion)} className="text-sm text-marca underline">
                {copiado ? "¡Copiado!" : "Copiar"}
              </button>
            </li>
            <li>El bot te confirmará y esta página se actualizará sola.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button onClick={() => consultar()} disabled={verificando} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-60">
              {verificando ? "Verificando…" : "Ya lo envié, verificar"}
            </button>
            <button onClick={generar} disabled={generando} className="text-slate-600 underline">
              Generar otro código
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TelegramPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Vincular Telegram</h1>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
