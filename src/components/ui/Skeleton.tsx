export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[10px] bg-line ${className}`} />;
}

// Tarjeta de evento en carga (misma silueta que EventoCard).
export function EventoCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[16px] border border-line bg-surface">
      <div className="h-40 animate-pulse bg-line" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-1.5 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ cantidad = 6, texto = "Cargando eventos…" }: { cantidad?: number; texto?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{texto}</span>
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
        {Array.from({ length: cantidad }, (_, i) => (
          <EventoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
