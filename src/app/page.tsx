import Link from "next/link";

export default function Inicio() {
  return (
    <section className="rounded-2xl bg-marca px-6 py-16 text-center text-white">
      <h1 className="text-3xl font-bold sm:text-5xl">Los eventos de tu colegio, en un solo lugar</h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
        Ferias de ciencia, torneos intercolegiales, escuelas de padres y muestras culturales.
        Inscríbete y recibe avisos por correo y Telegram.
      </p>
      <Link
        href="/eventos"
        className="mt-8 inline-block rounded-lg bg-acento px-6 py-3 font-semibold text-slate-900"
      >
        Ver eventos
      </Link>
    </section>
  );
}
