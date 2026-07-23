import type { Metadata } from "next";
import SpanishInfoPage from "../../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Cómo leer los precios regionales",
  description:
    "Aprende a comparar correctamente los precios regionales de una suscripción.",
};

export default function SpanishPriceGuidePage() {
  return (
    <SpanishInfoPage
      eyebrow="Guía de precios"
      title="Cómo leer los precios regionales"
      description="Combina el precio local, la conversión, los impuestos y la diferencia frente a la referencia estadounidense."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Comprueba primero el importe en moneda local y el ciclo de
          facturación. Después compara la equivalencia en dólares calculada con
          el mismo tipo de cambio. No mezcles planes mensuales con anuales ni
          planes individuales con familiares.
        </p>
        <p>
          No te fijes solo en la región más barata: revisa también los impuestos,
          la fecha del precio y la fiabilidad de los datos. Un precio bajo no
          garantiza que el plan pueda contratarse con cualquier cuenta o método
          de pago.
        </p>
      </div>
    </SpanishInfoPage>
  );
}
