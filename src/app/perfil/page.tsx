"use client";
// Perfil (WF01): ver datos, editar nombre / contraseña y desactivar la cuenta (borrado lógico).
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Perfil } from "@/types/api";
import { actualizarPerfil, desactivarCuenta, obtenerPerfil } from "@/lib/api/usuarios";
import { useAuth } from "@/context/AuthContext";
import { fechaHora } from "@/lib/fechas";
import { RequiereSesion } from "@/components/RequiereSesion";
import { Alert } from "@/components/ui/Alert";
import { Campo } from "@/components/ui/Campo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loading";
import { Skeleton } from "@/components/ui/Skeleton";

type Mensaje = { tipo: "exito" | "error"; texto: string } | null;
const tarjeta = "rounded-[16px] border border-line bg-surface p-6";
const boton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] px-5 text-base font-bold disabled:opacity-60";

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Contenido() {
  const { cerrarSesion } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msgEditar, setMsgEditar] = useState<Mensaje>(null);

  const [passDesactivar, setPassDesactivar] = useState("");
  const [desactivando, setDesactivando] = useState(false);
  const [msgDesactivar, setMsgDesactivar] = useState<Mensaje>(null);
  const [confirmar, setConfirmar] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerPerfil();
    if (res.ok) {
      setPerfil(res.data);
      setNombre(res.data.nombre);
    } else setError(res.error.message);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cerrarModal = useCallback(() => setConfirmar(false), []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    const cambios: { nombre?: string; password_actual?: string; password_nueva?: string } = {};
    if (nombre.trim() !== perfil.nombre) cambios.nombre = nombre.trim();
    if (passNueva) {
      cambios.password_actual = passActual;
      cambios.password_nueva = passNueva;
    }
    if (!cambios.nombre && !cambios.password_nueva) {
      setMsgEditar({ tipo: "error", texto: "No hay cambios para guardar." });
      return;
    }
    setGuardando(true);
    setMsgEditar(null);
    const res = await actualizarPerfil(cambios);
    setGuardando(false);
    if (res.ok) {
      setPerfil(res.data);
      setPassActual("");
      setPassNueva("");
      setMsgEditar({ tipo: "exito", texto: "Perfil actualizado." });
    } else setMsgEditar({ tipo: "error", texto: res.error.message });
  }

  function pedirDesactivar(e: FormEvent) {
    e.preventDefault();
    setConfirmar(true);
  }

  async function desactivar() {
    setDesactivando(true);
    setMsgDesactivar(null);
    const res = await desactivarCuenta(passDesactivar);
    setDesactivando(false);
    setConfirmar(false);
    if (res.ok) {
      await cerrarSesion();
      router.push("/");
    } else setMsgDesactivar({ tipo: "error", texto: res.error.message });
  }

  if (cargando)
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Cargando tu perfil…</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error || !perfil)
    return (
      <Alert
        tipo="error"
        titulo="No pudimos cargar tu perfil"
        accion={
          <button
            type="button"
            onClick={cargar}
            className="min-h-11 rounded-[10px] border border-cancelado-fg px-4 text-sm font-bold text-cancelado-fg hover:bg-white/60"
          >
            Reintentar
          </button>
        }
      >
        {error ?? "No se pudo cargar el perfil."}
      </Alert>
    );

  return (
    <div className="space-y-6">
      <section className={`${tarjeta} flex flex-wrap items-center gap-5`}>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy font-display text-2xl font-bold text-white">
          {iniciales(perfil.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold text-ink">{perfil.nombre}</h2>
          <p className="truncate text-[15px] text-muted">{perfil.email}</p>
        </div>
        <dl className="grid w-full gap-4 border-t border-line pt-4 text-[15px] sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Estado</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-bold text-ok-fg">
                {perfil.estado === "ACTIVO" ? "Activa" : "Inactiva"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Registrado</dt>
            <dd className="mt-1 font-semibold text-ink">{fechaHora(perfil.fecha_registro)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Telegram</dt>
            <dd className="mt-1">
              {perfil.telegram_vinculado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-bold text-ok-fg">
                  <Icon name="check" size={14} /> Vinculado{perfil.telegram_username ? ` · @${perfil.telegram_username}` : ""}
                </span>
              ) : (
                <Link
                  href="/telegram"
                  className="inline-flex items-center gap-1.5 rounded-full bg-espera-bg px-2.5 py-1 text-xs font-bold text-espera-fg hover:underline"
                >
                  <Icon name="send" size={14} /> No vinculado · Vincular ahora
                </Link>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <form onSubmit={guardar} className={`${tarjeta} space-y-4`}>
        <h2 className="font-display text-xl font-bold text-ink">Editar perfil</h2>
        {msgEditar && <Alert tipo={msgEditar.tipo}>{msgEditar.texto}</Alert>}
        <Campo
          etiqueta="Nombre"
          required
          minLength={3}
          maxLength={80}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          ayuda="El correo no se puede cambiar."
        />
        <p className="text-sm text-muted">Para cambiar la contraseña completa los dos campos.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Contraseña actual"
            type="password"
            autoComplete="current-password"
            required={!!passNueva}
            value={passActual}
            onChange={(e) => setPassActual(e.target.value)}
          />
          <Campo
            etiqueta="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={passNueva}
            onChange={(e) => setPassNueva(e.target.value)}
            ayuda="Mínimo 8, letras y números."
          />
        </div>
        <button disabled={guardando} className={`${boton} bg-navy text-white hover:bg-navy-deep`}>
          {guardando && <Spinner className="h-5 w-5" />}
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <form onSubmit={pedirDesactivar} className="space-y-4 rounded-[16px] border border-[#FCA5A5] bg-surface p-6">
        <h2 className="font-display text-xl font-bold text-cancelado-fg">Desactivar cuenta</h2>
        <p className="text-[15px] text-muted">
          Tu cuenta quedará INACTIVA y se cerrarán tus sesiones. Tus datos no se eliminan.
        </p>
        {msgDesactivar && <Alert tipo={msgDesactivar.tipo}>{msgDesactivar.texto}</Alert>}
        <Campo
          etiqueta="Confirma con tu contraseña"
          type="password"
          required
          autoComplete="current-password"
          value={passDesactivar}
          onChange={(e) => setPassDesactivar(e.target.value)}
        />
        <button disabled={desactivando} className={`${boton} border border-[#DC2626] text-[#B91C1C] hover:bg-cancelado-bg`}>
          Desactivar mi cuenta
        </button>
      </form>

      <ConfirmDialog
        abierto={confirmar}
        titulo="¿Desactivar tu cuenta?"
        textoConfirmar={desactivando ? "Desactivando…" : "Sí, desactivar"}
        textoCancelar="No, volver"
        peligro
        ocupado={desactivando}
        onConfirmar={desactivar}
        onCerrar={cerrarModal}
      >
        Se cerrarán todas tus sesiones y no podrás inscribirte a eventos. Tus datos se conservan.
      </ConfirmDialog>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Mi perfil</h1>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
