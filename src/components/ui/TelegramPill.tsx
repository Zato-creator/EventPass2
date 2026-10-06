"use client";
// Pill con el estado de vinculación de Telegram (WF03 · estado).
import Link from "next/link";
import { useEffect, useState } from "react";
import { estadoTelegram } from "@/lib/api/telegram";
import { Icon } from "./Icon";

export function TelegramPill({ textoSinVincular = "Vincula Telegram para inscribirte" }: { textoSinVincular?: string }) {
  const [vinculado, setVinculado] = useState<boolean | null>(null);
  useEffect(() => {
    let vigente = true;
    estadoTelegram().then((res) => vigente && setVinculado(res.ok ? res.data.vinculado : null));
    return () => {
      vigente = false;
    };
  }, []);
  if (vinculado === null) return null;
  return vinculado ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-bold text-ok-fg">
      <Icon name="check" size={14} /> Telegram vinculado
    </span>
  ) : (
    <Link
      href="/telegram"
      className="inline-flex items-center gap-1.5 rounded-full bg-espera-bg px-3 py-1 text-xs font-bold text-espera-fg hover:underline"
    >
      <Icon name="send" size={14} /> {textoSinVincular}
    </Link>
  );
}
