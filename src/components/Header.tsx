"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { estadoTelegram } from "@/lib/api/telegram";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/ui/Icon";

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

function NavLink({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-2 px-1 text-[15px] font-semibold transition-colors ${
        activo ? "border-marigold text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { usuario, cerrarSesion } = useAuth();
  const pathname = usePathname();
  const [telegram, setTelegram] = useState<boolean | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Estado de Telegram (WF03). Se refresca al navegar, p. ej. después de vincular.
  useEffect(() => {
    if (!usuario) {
      setTelegram(null);
      return;
    }
    let vigente = true;
    estadoTelegram().then((res) => {
      if (vigente) setTelegram(res.ok ? res.data.vinculado : null);
    });
    return () => {
      vigente = false;
    };
  }, [usuario, pathname]);

  // Cerrar el menú al navegar, al hacer clic fuera o con Escape.
  useEffect(() => setMenuAbierto(false), [pathname]);
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setMenuAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [menuAbierto]);

  const salir = async () => {
    setMenuAbierto(false);
    await cerrarSesion();
  };

  return (
    <header className="border-b border-line bg-surface">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3"
      >
        <Logo />

        <div className="flex items-center gap-5">
          <NavLink href="/eventos" activo={pathname.startsWith("/eventos")}>
            Eventos
          </NavLink>
          {usuario && (
            <NavLink href="/mis-inscripciones" activo={pathname.startsWith("/mis-inscripciones")}>
              Mis inscripciones
            </NavLink>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {usuario ? (
            <>
              {telegram === true && (
                <Link
                  href="/telegram"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ok-bg px-3 text-sm font-semibold text-ok-fg"
                >
                  <Icon name="check" size={16} />
                  Telegram vinculado
                </Link>
              )}
              {telegram === false && (
                <Link
                  href="/telegram"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-espera-bg px-3 text-sm font-semibold text-espera-fg"
                >
                  <Icon name="send" size={16} />
                  Vincular Telegram
                </Link>
              )}

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAbierto((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuAbierto}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line py-1 pl-1 pr-2.5 hover:bg-ground"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {iniciales(usuario.nombre)}
                  </span>
                  <span className="max-w-[10rem] truncate text-[15px] font-semibold text-ink">
                    {usuario.nombre.split(" ")[0]}
                  </span>
                  <Icon name="chevronDown" size={16} className="text-muted" />
                </button>

                {menuAbierto && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[14px] border border-line bg-surface py-1 shadow-lg shadow-ink/10"
                  >
                    <p className="truncate border-b border-line px-4 py-2.5 text-sm text-muted">{usuario.email}</p>
                    <Link role="menuitem" href="/perfil" className="flex min-h-11 items-center gap-2.5 px-4 text-[15px] text-ink hover:bg-ground">
                      <Icon name="user" size={18} className="text-muted" /> Perfil
                    </Link>
                    <Link role="menuitem" href="/telegram" className="flex min-h-11 items-center gap-2.5 px-4 text-[15px] text-ink hover:bg-ground">
                      <Icon name="send" size={18} className="text-muted" /> Telegram
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={salir}
                      className="flex min-h-11 w-full items-center gap-2.5 border-t border-line px-4 text-left text-[15px] text-cancelado-fg hover:bg-cancelado-bg"
                    >
                      <Icon name="logout" size={18} /> Salir
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-11 items-center px-2 text-[15px] font-semibold text-navy hover:underline">
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-marigold px-4 text-[15px] font-bold text-ink hover:brightness-95"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
