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
import { Loading } from "@/components/ui/Loading";
import { Alert } from "@/components/ui/Alert";

type Mensaje = { tipo: "exito" | "error"; texto: string } | null;
const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal";

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

  async function desactivar(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm("¿Seguro que quieres desactivar tu cuenta? Se cerrarán todas tus sesiones.")) return;
    setDesactivando(true);
    setMsgDesactivar(null);
    const res = await desactivarCuenta(passDesactivar);
    setDesactivando(false);
    if (res.ok) {
      await cerrarSesion();
      router.push("/");
    } else setMsgDesactivar({ tipo: "error", texto: res.error.message });
  }

  if (cargando) return <Loading texto="Cargando tu perfil…" />;
  if (error || !perfil)
    return (
      <Alert tipo="error">
        {error ?? "No se pudo cargar el perfil."}{" "}
        <button onClick={cargar} className="font-semibold underline">Reintentar</button>
      </Alert>
    );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Mis datos</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-slate-500">Nombre</dt><dd>{perfil.nombre}</dd></div>
          <div><dt className="font-medium text-slate-500">Correo</dt><dd>{perfil.email}</dd></div>
          <div><dt className="font-medium text-slate-500">Estado</dt><dd>{perfil.estado}</dd></div>
          <div><dt className="font-medium text-slate-500">Registrado</dt><dd>{fechaHora(perfil.fecha_registro)}</dd></div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500">Telegram</dt>
            <dd>
              {perfil.telegram_vinculado ? (
                <>✅ Vinculado{perfil.telegram_username ? ` como @${perfil.telegram_username}` : ""}</>
              ) : (
                <>
                  ⚠️ No vinculado — es necesario para inscribirte.{" "}
                  <Link href="/telegram" className="font-semibold text-marca underline">Vincular ahora</Link>
                </>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <form onSubmit={guardar} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Editar perfil</h2>
        {msgEditar && <Alert tipo={msgEditar.tipo}>{msgEditar.texto}</Alert>}
        <label className="block text-sm font-medium">
          Nombre
          <input required minLength={3} maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
        </label>
        <p className="text-sm text-slate-500">Para cambiar la contraseña completa los dos campos (el correo no se puede cambiar).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Contraseña actual
            <input type="password" autoComplete="current-password" required={!!passNueva} value={passActual}
              onChange={(e) => setPassActual(e.target.value)} className={input} />
          </label>
          <label className="block text-sm font-medium">
            Nueva contraseña
            <input type="password" autoComplete="new-password" minLength={8} value={passNueva}
              onChange={(e) => setPassNueva(e.target.value)} placeholder="Mín. 8, letras y números" className={input} />
          </label>
        </div>
        <button disabled={guardando} className="rounded-lg bg-marca px-5 py-2 font-semibold text-white disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <form onSubmit={desactivar} className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-5">
        <h2 className="text-lg font-bold text-red-800">Desactivar cuenta</h2>
        <p className="text-sm text-slate-700">
          Tu cuenta quedará INACTIVA y se cerrarán tus sesiones. Tus datos no se eliminan.
        </p>
        {msgDesactivar && <Alert tipo={msgDesactivar.tipo}>{msgDesactivar.texto}</Alert>}
        <label className="block text-sm font-medium">
          Confirma con tu contraseña
          <input type="password" required autoComplete="current-password" value={passDesactivar}
            onChange={(e) => setPassDesactivar(e.target.value)} className={input} />
        </label>
        <button disabled={desactivando} className="rounded-lg bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-60">
          {desactivando ? "Desactivando…" : "Desactivar mi cuenta"}
        </button>
      </form>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequiereSesion>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <Contenido />
      </div>
    </RequiereSesion>
  );
}
