import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { ChatWidget } from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "EventPass Colegios",
  description: "Eventos escolares: ferias, torneos, escuelas de padres y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="py-8 text-center text-sm text-slate-500">
            EventPass Colegios · Proyecto académico
          </footer>
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
