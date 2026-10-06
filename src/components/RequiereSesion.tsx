"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "./ui/Loading";
import { Alert } from "./ui/Alert";

// Envuelve páginas privadas: muestra el contenido solo si hay sesión.
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Loading texto="Verificando sesión…" />;
  if (!usuario)
    return (
      <Alert tipo="info">
        Necesitas <Link href="/login" className="font-semibold underline">iniciar sesión</Link> para ver esta página.
      </Alert>
    );
  return <>{children}</>;
}
