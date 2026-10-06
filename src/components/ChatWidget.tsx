"use client";
// Widget del asistente EventPass (WF10). Habla directo con el Chat Trigger de n8n vía @n8n/chat.
// El asistente es solo informativo: no inscribe ni modifica nada.
import { useEffect } from "react";
import "@n8n/chat/style.css";
import { useAuth } from "@/context/AuthContext";
import { getVisitorId } from "@/lib/api/client";

const CHAT_URL = process.env.NEXT_PUBLIC_N8N_CHAT_URL ?? "";
const configurado = CHAT_URL.startsWith("http") && !CHAT_URL.includes("tu-instancia");

export function ChatWidget() {
  const { usuario, cargando } = useAuth();
  const usuarioId = usuario?.usuario_id ?? null;

  useEffect(() => {
    if (!configurado || cargando) return;
    let app: { unmount: () => void } | null = null;
    let cancelado = false;

    import("@n8n/chat").then(({ createChat }) => {
      if (cancelado) return;
      app = createChat({
        webhookUrl: CHAT_URL,
        target: "#ep-chat",
        mode: "window",
        loadPreviousSession: false,
        showWelcomeScreen: false,
        defaultLanguage: "en",
        metadata: { visitor_id: getVisitorId(), usuario_id: usuarioId },
        initialMessages: [
          "¡Hola! 👋 Soy EventPass Assistant.",
          "Pregúntame por eventos, fechas, lugares, cupos, lista de espera o cómo vincular Telegram.",
        ],
        i18n: {
          en: {
            title: "EventPass Assistant",
            subtitle: "Soporte informativo · eventos escolares",
            footer: "",
            getStarted: "Nueva conversación",
            inputPlaceholder: "Escribe tu pregunta…",
            closeButtonTooltip: "Cerrar",
          },
        },
      });
    });

    return () => {
      cancelado = true;
      app?.unmount();
    };
    // Se recrea al iniciar/cerrar sesión para enviar el usuario_id correcto en metadata.
  }, [usuarioId, cargando]);

  if (!configurado) return null;
  return <div id="ep-chat" />;
}
