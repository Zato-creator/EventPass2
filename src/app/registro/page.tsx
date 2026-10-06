"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { registrar } from "@/lib/api/usuarios";
import { Alert } from "@/components/ui/Alert";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await registrar(nombre, email, password);
    setEnviando(false);
    if (res.ok) setExito(true);
    else setError(res.error.message);
  }

  if (exito)
    return (
      <div className="mx-auto max-w-sm">
        <Alert tipo="exito">
          ¡Cuenta creada! Ahora puedes <Link href="/login" className="font-semibold underline">iniciar sesión</Link>.
        </Alert>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      {error && <Alert tipo="error">{error}</Alert>}
      <input required minLength={3} placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <input type="email" required placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <input type="password" required minLength={8} placeholder="Contraseña (mín. 8, letras y números)" value={password}
        onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <button disabled={enviando} className="w-full rounded-lg bg-marca py-2 font-semibold text-white disabled:opacity-60">
        {enviando ? "Creando cuenta…" : "Registrarme"}
      </button>
    </form>
  );
}
