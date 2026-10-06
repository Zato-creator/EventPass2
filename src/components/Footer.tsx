import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-16 bg-ink text-white/80">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-6 py-10">
        <div className="max-w-xs">
          <Logo tono="oscuro" />
          <p className="mt-4 text-sm leading-relaxed">
            Ferias, torneos, escuelas de padres y muestras culturales. Inscripción con cupos en tiempo real y
            avisos por correo y Telegram.
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
          <Link href="/eventos" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
            Eventos
          </Link>
          <Link href="/mis-inscripciones" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
            Mis inscripciones
          </Link>
          <Link href="/telegram" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
            Telegram
          </Link>
          <Link href="/perfil" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
            Perfil
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1200px] px-6 py-4 text-sm text-white/70">
          EventPass Colegios · Proyecto académico 2026
        </p>
      </div>
    </footer>
  );
}
