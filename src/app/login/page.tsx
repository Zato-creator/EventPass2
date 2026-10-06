"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/Alert";
import { AuthCard } from "@/components/AuthCard";
import { Campo, botonPrimario } from "@/components/ui/Campo";
import { Spinner } from "@/components/ui/Loading";

type Errores = { email?: string; password?: string };

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const faltan: Errores = {};
    if (!email.trim()) faltan.email = "Escribe tu correo.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) faltan.email = "Revisa el formato del correo.";
    if (!password) faltan.password = "Escribe tu contraseña.";
    setErrores(faltan);
    if (faltan.email || faltan.password) return;

    setEnviando(true);
    setError(null);
    const res = await iniciarSesion(email, password);
    setEnviando(false);
    if (res.ok) router.push("/eventos");
    else {
      setError(res.error.message);
      if (res.error.code === "CREDENCIALES_INVALIDAS") setErrores({ password: "Correo o contraseña incorrectos." });
    }
  }

  return (
    <AuthCard
      titulo="Iniciar sesión"
      subtitulo="Entra para inscribirte y ver tus eventos."
      pie={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-navy underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tipo="error">{error}</Alert>}
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          error={errores.email}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
        />
        <button disabled={enviando} className={botonPrimario}>
          {enviando && <Spinner className="h-5 w-5" />}
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthCard>
  );
}
