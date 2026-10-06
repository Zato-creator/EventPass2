"use client";
// Vincular Telegram (WF03): estado, generar código temporal e instrucciones /vincular CODIGO.
import { useCallback, useEffect, useState } from "react";
import type { CodigoVinculacion, EstadoTelegram } from "@/types/api";
import { estadoTelegram, generarCodigo } from "@/lib/api/telegram";
import { fechaHora } from "@/lib/fechas";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Loading, Spinner } from "@/components/ui/Loading";

const boton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] px-5 text-base font-bold disabled:opacity-60";

// Segundos que faltan para que expire el código (solo para la cuenta regresiva visual).
function useRestante(expira: string | undefined) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!expira) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expira]);
  if (!expira) return null;
  const fin = new Date(expira).getTime();
  return Number.isNaN(fin) ? null : Math.max(0, Math.floor((fin - ahora) / 1000));
}

function Contenido() {
  const [estado, setEstado] = useState<EstadoTelegram | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<CodigoVinculacion | null>(null);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const restante = useRestante(codigo?.expira_en);
  const expirado = restante === 0;

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
      <section className="rounded-[18px] border border-[#86EFAC] bg-ok-bg p-6 text-ok-fg" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white">
          <Icon name="check" size={24} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold">
          Tu cuenta está vinculada{estado.telegram_username ? ` a @${estado.telegram_username}` : " a Telegram"}
        </h2>
        {estado.fecha_vinculacion && <p className="mt-1 text-[15px]">Desde el {fechaHora(estado.fecha_vinculacion)}.</p>}
        <p className="mt-3 text-[15px]">
          Recibirás confirmaciones, avisos de lista de espera y recordatorios por correo y Telegram.
        </p>
      </section>
    );

  const bot = codigo?.bot_username || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";
  const mm = restante !== null ? String(Math.floor(restante / 60)).padStart(2, "0") : "";
  const ss = restante !== null ? String(restante % 60).padStart(2, "0") : "";

  return (
    <div className="space-y-5">
      {error && <Alert tipo="error">{error}</Alert>}

      {!codigo ? (
        <section className="rounded-[18px] border border-line bg-surface p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#229ED9] text-white">
            <Icon name="send" size={24} />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">Vincula tu cuenta en 3 pasos</h2>
          <p className="mt-2 text-[15px] text-muted">
            Vincular Telegram es obligatorio para inscribirte. Así te llegan las confirmaciones y recordatorios también
            por chat.
          </p>
          <button onClick={generar} disabled={generando} className={`${boton} mt-6 w-full bg-navy text-white hover:bg-navy-deep sm:w-auto`}>
            {generando && <Spinner className="h-5 w-5" />}
            {generando ? "Generando código…" : "Generar código de vinculación"}
          </button>
        </section>
      ) : (
        <section className="rounded-[18px] border border-line bg-surface p-6 shadow-xl shadow-ink/[0.07] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wider text-muted">Tu código</p>
            {restante !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                  expirado ? "bg-cancelado-bg text-cancelado-fg" : "bg-espera-bg text-espera-fg"
                }`}
                aria-live="off"
              >
                <Icon name="clock" size={15} />
                {expirado ? "Expirado" : `Expira en ${mm}:${ss}`}
              </span>
            )}
          </div>
          <p
            className={`mt-3 break-all font-display text-5xl font-extrabold tracking-[0.35em] sm:text-6xl ${
              expirado ? "text-muted line-through" : "text-ink"
            }`}
            aria-label={`Código ${codigo.codigo.split("").join(" ")}`}
          >
            {codigo.codigo}
          </p>
          <p className="mt-1 text-sm text-muted">Válido hasta {fechaHora(codigo.expira_en)}.</p>

          {expirado ? (
            <div className="mt-6">
              <Alert tipo="info">El código expiró. Genera uno nuevo para continuar.</Alert>
              <button onClick={generar} disabled={generando} className={`${boton} mt-4 w-full bg-navy text-white hover:bg-navy-deep`}>
                {generando && <Spinner className="h-5 w-5" />}
                {generando ? "Generando código…" : "Generar otro código"}
              </button>
            </div>
          ) : (
            <>
              <ol className="mt-6 space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display font-bold text-white">1</span>
                  <div className="min-w-0 flex-1 pt-1 text-[15px] text-ink">
                    Abre el bot {bot ? <strong>@{bot}</strong> : "de EventPass"} en Telegram y pulsa <strong>Iniciar</strong>.
                    {bot && (
                      <a
                        href={`https://t.me/${bot}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`${boton} mt-3 w-full bg-[#229ED9] text-white hover:brightness-95 sm:w-auto`}
                      >
                        <Icon name="send" size={18} /> Abrir el bot en Telegram
                      </a>
                    )}
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display font-bold text-white">2</span>
                  <div className="min-w-0 flex-1 pt-1 text-[15px] text-ink">
                    Envíale este mensaje:
                    <div className="mt-2 flex flex-wrap items-stretch gap-2">
                      <code className="flex min-h-12 flex-1 items-center rounded-[10px] border border-line bg-ground px-4 font-mono text-lg font-bold text-ink">
                        {codigo.instruccion}
                      </code>
                      <button
                        type="button"
                        onClick={() => copiar(codigo.instruccion)}
                        className={`${boton} border border-input-border text-ink hover:bg-ground`}
                      >
                        <Icon name={copiado ? "check" : "copy"} size={18} />
                        {copiado ? "¡Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display font-bold text-white">3</span>
                  <p className="min-w-0 flex-1 pt-1 text-[15px] text-ink">
                    El bot te confirmará y esta página se actualizará sola.
                  </p>
                </li>
              </ol>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => consultar()}
                  disabled={verificando}
                  className={`${boton} bg-navy text-white hover:bg-navy-deep`}
                >
                  {verificando && <Spinner className="h-5 w-5" />}
                  {verificando ? "Verificando…" : "Ya lo envié, verificar"}
                </button>
                <button
                  type="button"
                  onClick={generar}
                  disabled={generando}
                  className="min-h-11 px-2 text-[15px] font-semibold text-navy underline disabled:opacity-60"
                >
                  Generar otro código
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default function TelegramPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Vincular Telegram</h1>
          <p className="mt-1 text-[15px] text-muted">Recibe confirmaciones y recordatorios de tus eventos por chat.</p>
        </div>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
