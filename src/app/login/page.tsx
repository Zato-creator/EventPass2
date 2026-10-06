"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await iniciarSesion(email, password);
    setEnviando(false);
    if (res.ok) router.push("/eventos");
    else setError(res.error.message);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      {error && <Alert tipo="error">{error}</Alert>}
      <input type="email" required placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <button disabled={enviando} className="w-full rounded-lg bg-marca py-2 font-semibold text-white disabled:opacity-60">
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-center text-sm">
        ¿No tienes cuenta? <Link href="/registro" className="text-marca underline">Regístrate</Link>
      </p>
    </form>
  );
}
