import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  etiqueta: string;
  error?: string | null;
  ayuda?: ReactNode;
};

// Campo de formulario con label visible, ayuda y error inline asociados por aria-describedby.
export function Campo({ etiqueta, error, ayuda, className = "", ...input }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe}
        {...input}
        className={`mt-1.5 min-h-12 w-full rounded-[10px] border bg-surface px-3.5 text-base text-ink placeholder:text-muted ${
          error ? "border-[#DC2626]" : "border-input-border"
        }`}
      />
      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-sm text-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#B91C1C]">
          <Icon name="alert" size={16} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export const botonPrimario =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-navy px-5 text-base font-bold text-white hover:bg-navy-deep disabled:opacity-60";
