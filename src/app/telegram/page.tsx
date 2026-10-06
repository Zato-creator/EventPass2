"use client";
import { RequiereSesion } from "@/components/RequiereSesion";

export default function TelegramPage() {
  return (
    <RequiereSesion>
      <h1 className="text-2xl font-bold">Vincular Telegram</h1>
      {/* TODO(DEV-B): mostrar estado (estadoTelegram), botón para generar código (generarCodigo) e instrucciones /vincular CODIGO — src/lib/api/telegram.ts. Manejar loading / éxito / error. */}
      <p className="mt-4 text-slate-600">En construcción.</p>
    </RequiereSesion>
  );
}
