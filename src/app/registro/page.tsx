"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { registrar } from "@/lib/api/usuarios";
import { Alert } from "@/components/ui/Alert";
import { AuthCard } from "@/components/AuthCard";
import { Campo, botonPrimario } from "@/components/ui/Campo";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loading";

type Errores = { nombre?: string; email?: string; password?: string };

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [exito, setExito] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const faltan: Errores = {};
    if (nombre.trim().length < 3) faltan.nombre = "Escribe tu nombre completo (mínimo 3 caracteres).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) faltan.email = "Escribe un correo válido.";
    if (password.length < 8) faltan.password = "La contraseña debe tener al menos 8 caracteres.";
    setErrores(faltan);
    if (Object.keys(faltan).length) return;

    setEnviando(true);
    setError(null);
    const res = await registrar(nombre, email, password);
    setEnviando(false);
    if (res.ok) setExito(true);
    else {
      setError(res.error.message);
      if (res.error.code === "EMAIL_DUPLICADO") setErrores({ email: "Ya existe una cuenta con este correo." });
    }
  }

  if (exito)
    return (
      <AuthCard titulo="¡Cuenta creada!" subtitulo="Ya puedes entrar con tu correo y contraseña.">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[14px] bg-ok-bg p-4 text-ok-fg">
            <Icon name="check" size={22} className="shrink-0" />
            <p className="text-[15px] font-semibold">Tu cuenta quedó registrada. El siguiente paso es vincular Telegram.</p>
          </div>
          <Link href="/login" className={botonPrimario}>
            Iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard
      titulo="Crear cuenta"
      subtitulo="Inscríbete a eventos y recibe avisos por correo y Telegram."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-navy underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tipo="error">{error}</Alert>}
        <Campo
          etiqueta="Nombre completo"
          autoComplete="name"
          maxLength={80}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Laura Gómez"
          error={errores.nombre}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          ayuda="Mínimo 8 caracteres, con letras y números."
          error={errores.password}
        />
        <button disabled={enviando} className={botonPrimario}>
          {enviando && <Spinner className="h-5 w-5" />}
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
