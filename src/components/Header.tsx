"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { usuario, cerrarSesion } = useAuth();
  return (
    <header className="bg-marca text-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🎒 EventPass <span className="text-acento">Colegios</span>
        </Link>
        <Link href="/eventos" className="hover:underline">Eventos</Link>
        <div className="ml-auto flex items-center gap-4">
          {usuario ? (
            <>
              <Link href="/mis-inscripciones" className="hover:underline">Mis inscripciones</Link>
              <Link href="/telegram" className="hover:underline">Telegram</Link>
              <Link href="/perfil" className="hover:underline">{usuario.nombre.split(" ")[0]}</Link>
              <button onClick={cerrarSesion} className="rounded bg-white/15 px-3 py-1 hover:bg-white/25">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Iniciar sesión</Link>
              <Link href="/registro" className="rounded bg-acento px-3 py-1 font-semibold text-slate-900">
                Registrarme
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
