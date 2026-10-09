// Proxy hacia los webhooks de n8n.  Dueño: DEV-A.
// SOLO reenvía la petición y agrega X-EP-Key. Prohibido agregar lógica de negocio aquí.
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.N8N_WEBHOOK_BASE_URL;
const KEY = process.env.EP_API_KEY;

// Rutas permitidas (deben coincidir con docs/CONTRATOS_API.md)
const PERMITIDAS = new Set(["usuarios", "auth", "telegram", "catalogo", "inscripciones", "checkin-digital"]);

type Ctx = { params: Promise<{ path: string[] }> };

async function reenviar(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const ruta = path.join("/");

  if (!BASE || !KEY) {
    return NextResponse.json(
      { ok: false, error: { code: "CONFIG", message: "Faltan variables de entorno del servidor." } },
      { status: 500 },
    );
  }
  if (!PERMITIDAS.has(ruta)) {
    return NextResponse.json(
      { ok: false, error: { code: "RUTA_NO_PERMITIDA", message: "Ruta no disponible." } },
      { status: 404 },
    );
  }

  const destino = `${BASE}/ep/${ruta}${req.nextUrl.search}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-EP-Key": KEY,
  };
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(destino, {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
    const texto = await res.text();
    return new NextResponse(texto, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "N8N_NO_DISPONIBLE", message: "No se pudo contactar el servidor." } },
      { status: 502 },
    );
  }
}

export const GET = reenviar;
export const POST = reenviar;
