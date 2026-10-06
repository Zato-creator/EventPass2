import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Props = { icono?: IconName; titulo: string; children?: ReactNode; accion?: ReactNode };

export function EmptyState({ icono = "calendar", titulo, children, accion }: Props) {
  return (
    <div className="flex flex-col items-center rounded-[16px] border border-dashed border-input-border bg-surface px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ground text-muted">
        <Icon name={icono} size={28} />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-ink">{titulo}</h2>
      {children && <div className="mt-2 max-w-md text-[15px] text-muted">{children}</div>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
