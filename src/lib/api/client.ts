// Cliente base para hablar con n8n a través del proxy /api/n8n.  Dueño: DEV-A.
// Los componentes NUNCA llaman fetch directo: usan las funciones de src/lib/api/*.ts.
import type { ApiResponse } from "@/types/api";

export const TOKEN_KEY = "ep_token";
export const VISITOR_KEY = "ep_visitor_id";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

type Opciones = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
  privado?: boolean; // si true, envía Authorization: Bearer <token>
};

export async function llamarN8n<T>(ruta: string, opts: Opciones = {}): Promise<ApiResponse<T>> {
  const params = new URLSearchParams();
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, v);
  });
  const qs = params.toString();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.privado) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/n8n/${ruta}${qs ? `?${qs}` : ""}`, {
      method: opts.method ?? "POST",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const json = (await res.json()) as ApiResponse<T>;
    return json;
  } catch {
    return { ok: false, error: { code: "RED", message: "No hay conexión con el servidor. Intenta de nuevo." } };
  }
}
