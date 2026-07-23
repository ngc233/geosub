import type { Metadata } from "next";
import SpanishInfoPage from "../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Condiciones de uso",
  description:
    "Condiciones básicas, alcance de la información y limitaciones al utilizar los datos de precios de GeoSub.",
};

export default function SpanishTermsPage() {
  return (
    <SpanishInfoPage
      eyebrow="Términos del servicio"
      title="Condiciones de uso"
      description="Estas son las condiciones básicas, el alcance de la información y las limitaciones aplicables a los datos de GeoSub."
    >
      <h2 className="text-xl font-black text-zinc-950">
        Naturaleza de la información
      </h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub ofrece precios públicos, comparaciones regionales e información
        sobre suscripciones. No constituye asesoramiento jurídico, financiero
        ni de compra.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Las suscripciones entre regiones pueden depender de la región de la
        cuenta, el método de pago, los impuestos y las normas de la plataforma.
        Consulta la pantalla oficial de pago y las condiciones de cada servicio.
      </p>
    </SpanishInfoPage>
  );
}
