import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

// Tarjeta centrada de 420px para login y registro.
export function AuthCard({ titulo, subtitulo, children, pie }: { titulo: string; subtitulo: string; children: ReactNode; pie?: ReactNode }) {
  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-[18px] border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{titulo}</h1>
          <p className="mt-1 text-[15px] text-muted">{subtitulo}</p>
          <div className="mt-6">{children}</div>
        </div>
        {pie && <p className="mt-5 text-center text-[15px] text-muted">{pie}</p>}
      </div>
    </div>
  );
}
