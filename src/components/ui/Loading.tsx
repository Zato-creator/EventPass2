export function Loading({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-marca border-t-transparent" />
      <span>{texto}</span>
    </div>
  );
}
