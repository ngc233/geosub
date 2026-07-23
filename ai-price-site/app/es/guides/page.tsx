import type { Metadata } from "next";
import Link from "next/link";
import SpanishInfoPage from "../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Guías de precios de suscripciones",
  description:
    "Aprende a interpretar precios regionales, tipos de cambio, impuestos, pagos, cuentas y calidad de los datos.",
};

const guides = [
  {
    title: "Cómo leer los precios regionales",
    description:
      "Interpreta el precio local, su equivalencia en USD y la diferencia frente a EE. UU.",
    href: "/es/guides/price-guide/",
  },
  {
    title: "Pago y cuenta",
    description:
      "Revisa los métodos de pago y las condiciones de cuenta en suscripciones entre regiones.",
    href: "/es/guides/payment-account/",
  },
  {
    title: "Metodología",
    description:
      "Así recopila, revisa y publica GeoSub los precios regionales.",
    href: "/es/guides/methodology/",
  },
];

export default function SpanishGuidesPage() {
  return (
    <SpanishInfoPage
      eyebrow="Guías"
      title="Guías de precios de suscripciones"
      description="Reunimos los conceptos necesarios para interpretar las tablas de precios y revisar las condiciones antes de pagar."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-lime-300 hover:bg-lime-50/40"
          >
            <h2 className="font-black text-zinc-950">{guide.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {guide.description}
            </p>
          </Link>
        ))}
      </div>
    </SpanishInfoPage>
  );
}
