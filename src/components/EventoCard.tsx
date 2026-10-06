"use client";
import Link from "next/link";
import { useState } from "react";
import type { EventoPublico } from "@/types/api";
import { fechaEvento } from "@/lib/fechas";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { DateBadge } from "@/components/ui/DateBadge";
import { estadoVisualEvento, estiloCategoria } from "@/components/ui/tokens";

// Portada: imagen del evento sobre el tint de la categoría (se ve el ícono mientras carga o si falla).
export function PortadaEvento({ evento, alto = "h-40" }: { evento: EventoPublico; alto?: string }) {
  const cat = estiloCategoria(evento.categoria);
  const [fallo, setFallo] = useState(false);
  return (
    <div className={`relative ${alto} w-full overflow-hidden`} style={{ backgroundColor: cat.tint }}>
      <span className="absolute inset-0 flex items-center justify-center" style={{ color: cat.color }}>
        <Icon name={cat.icono} size={56} strokeWidth={1.5} />
      </span>
      {evento.imagen_url && !fallo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={evento.imagen_url}
          alt=""
          loading="lazy"
          onError={() => setFallo(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function EventoCard({ evento }: { evento: EventoPublico }) {
  const cat = estiloCategoria(evento.categoria);
  const estado = estadoVisualEvento(evento);
  const inactivo = evento.disponibilidad === "CERRADO" || evento.disponibilidad === "CANCELADO";
  const href = `/eventos/${evento.evento_id}`;

  const boton =
    evento.disponibilidad === "DISPONIBLE"
      ? { texto: "Inscribirme", clase: "bg-navy text-white hover:bg-navy-deep" }
      : evento.disponibilidad === "LLENO"
        ? { texto: "Unirme a la espera", clase: "bg-marigold text-ink hover:brightness-95" }
        : { texto: "Ver detalle", clase: "bg-ground text-ink border border-line hover:bg-line" };

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[16px] border border-line bg-surface transition hover:border-input-border ${
        inactivo ? "opacity-[0.82]" : ""
      }`}
    >
      <div className="relative">
        <PortadaEvento evento={evento} />
        <DateBadge fecha={evento.fecha} color={cat.color} className="absolute left-3 top-3" />
        <StatusBadge estado={estado} className="absolute right-3 top-3 shadow-sm" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
          {evento.categoria}
        </span>
        <h3 className="font-display text-xl font-bold leading-tight text-ink">
          <Link href={href} className="hover:underline">
            {evento.nombre}
          </Link>
        </h3>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Icon name="calendar" size={16} className="mt-0.5 shrink-0" />
          {fechaEvento(evento.fecha, evento.hora)}
        </p>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
          {evento.lugar}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <CapacityBar
            confirmados={evento.inscritos_confirmados}
            capacidad={evento.capacidad}
            disponibilidad={evento.disponibilidad}
            ultimos={estado === "ULTIMOS"}
          />
          <p className="text-sm text-muted">
            {inactivo ? (
              estado === "CANCELADO" ? "Evento cancelado" : "Inscripciones cerradas"
            ) : (
              <>
                <span className="font-semibold text-ink">{evento.cupos_disponibles}</span> de {evento.capacidad} cupos
                libres
                {evento.en_lista_espera > 0 && ` · ${evento.en_lista_espera} en espera`}
              </>
            )}
          </p>
          <Link
            href={href}
            aria-label={`${boton.texto}: ${evento.nombre}`}
            className={`mt-1 inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 text-[15px] font-bold ${boton.clase}`}
          >
            {boton.texto}
          </Link>
        </div>
      </div>
    </article>
  );
}
