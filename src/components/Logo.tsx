import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Logo: cuadrado navy con ticket marigold + "EventPass" / "COLEGIOS".
export function Logo({ tono = "claro" }: { tono?: "claro" | "oscuro" }) {
  const sobreOscuro = tono === "oscuro";
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-[10px]" aria-label="EventPass Colegios, inicio">
      <span
        className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-marigold ${
          sobreOscuro ? "bg-white/10" : "bg-navy"
        }`}
      >
        <Icon name="ticket" size={22} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-xl font-extrabold ${sobreOscuro ? "text-white" : "text-ink"}`}>
          EventPass
        </span>
        <span
          className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
            sobreOscuro ? "text-marigold" : "text-[#B7791F]"
          }`}
        >
          Colegios
        </span>
      </span>
    </Link>
  );
}
