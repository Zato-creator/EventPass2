export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Loading({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-muted">
      <Spinner className="h-5 w-5 text-navy" />
      <span>{texto}</span>
    </div>
  );
}
