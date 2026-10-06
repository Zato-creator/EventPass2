"use client";
// Manejo de sesión en el navegador.  Dueño: DEV-A.
// Solo guarda el token y los datos básicos; la validez real la decide n8n (WF02/WF11).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ApiResponse, LoginData } from "@/types/api";
import { TOKEN_KEY } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

type UsuarioSesion = LoginData["usuario"];

type AuthState = {
  usuario: UsuarioSesion | null;
  cargando: boolean; // true mientras se revisa la sesión guardada
  iniciarSesion: (email: string, password: string) => Promise<ApiResponse<LoginData>>;
  cerrarSesion: () => Promise<void>;
};

const USER_KEY = "ep_usuario";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const limpiar = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUsuario(null);
  }, []);

  // Al cargar la app: si hay token guardado, se valida contra n8n.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const guardado = localStorage.getItem(USER_KEY);
    if (!token || !guardado) {
      setCargando(false);
      return;
    }
    authApi.validarSesion().then((res) => {
      if (res.ok && res.data.valida) setUsuario(JSON.parse(guardado) as UsuarioSesion);
      else limpiar();
      setCargando(false);
    });
  }, [limpiar]);

  const iniciarSesion = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.ok) {
      localStorage.setItem(TOKEN_KEY, res.data.session_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.usuario));
      setUsuario(res.data.usuario);
    }
    return res;
  };

  const cerrarSesion = async () => {
    await authApi.logout();
    limpiar();
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
