import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Precios mundiales de suscripciones digitales",
  description:
    "Compara suscripciones de IA y streaming entre países y regiones, con precios locales, equivalencias en USD, información fiscal y poder adquisitivo.",
};

const sections = [
  {
    title: "Suscripciones de IA",
    description:
      "Compara por país los precios de ChatGPT, Claude, Gemini, Grok y otros servicios de IA.",
    href: "/es/ai-pricing/",
    tag: "IA",
  },
  {
    title: "Streaming",
    description:
      "Consulta las diferencias regionales de Netflix, Disney+ y otros servicios de streaming.",
    href: "/es/streaming-pricing/",
    tag: "Streaming",
  },
  {
    title: "Fuentes de datos",
    description:
      "Conoce el origen de los precios, los tipos de cambio, la información fiscal y el proceso de revisión.",
    href: "/es/data-sources/",
    tag: "Datos",
  },
  {
    title: "Guías",
    description:
      "Aprende a interpretar los precios regionales y a revisar las condiciones de pago y de cuenta.",
    href: "/es/guides/",
    tag: "Guías",
  },
];

export default function SpanishHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
            Precios mundiales de suscripciones digitales
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            Precios de suscripción de todo el mundo, en un solo lugar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSub compara suscripciones de IA y streaming entre países y
            regiones. Consulta el precio local, su equivalencia en dólares, la
            información fiscal y el contexto de poder adquisitivo.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
            >
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 group-hover:bg-lime-100 group-hover:text-lime-700">
                {section.tag}
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">
                {section.title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {section.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">
                Ver más <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
