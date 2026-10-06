"use client";
// Estado de "Mis inscripciones" (WF06).  Dueño: DEV-A.
// Solo orquesta llamadas a la API; las reglas (cupos, estados, permisos) las decide n8n.
import { useCallback, useEffect, useState } from "react";
import type { ApiResponse, Inscripcion, InscripcionConEvento } from "@/types/api";
import * as api from "@/lib/api/inscripciones";

export function useInscripciones() {
  const [inscripciones, setInscripciones] = useState<InscripcionConEvento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await api.listarInscripciones();
    if (res.ok) setInscripciones(res.data.inscripciones);
    else setError(res.error.message);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Después de una operación exitosa se recarga la lista desde n8n (fuente de verdad).
  const trasOperacion = useCallback(
    async (res: ApiResponse<{ inscripcion: Inscripcion }>) => {
      if (res.ok) await recargar();
      return res;
    },
    [recargar],
  );

  const actualizar = useCallback(
    async (inscripcion_id: string, nombre_acreditacion: string, observaciones: string) =>
      trasOperacion(await api.actualizarInscripcion({ inscripcion_id, nombre_acreditacion, observaciones })),
    [trasOperacion],
  );

  const cancelar = useCallback(
    async (inscripcion_id: string) => trasOperacion(await api.cancelarInscripcion(inscripcion_id)),
    [trasOperacion],
  );

  return { inscripciones, cargando, error, recargar, actualizar, cancelar };
}
