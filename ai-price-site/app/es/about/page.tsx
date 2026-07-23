import type { Metadata } from "next";
import SpanishInfoPage from "../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Acerca de GeoSub",
  description:
    "Descubre por qué GeoSub compara suscripciones digitales y cómo organiza los precios regionales.",
};

export default function SpanishAboutPage() {
  return (
    <SpanishInfoPage
      eyebrow="Acerca de GeoSub"
      title="Acerca de GeoSub"
      description="GeoSub organiza precios mundiales de suscripciones digitales para que sus diferencias sean fáciles de comparar y entender."
    >
      <h2 className="text-xl font-black text-zinc-950">Nuestro propósito</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        Un mismo servicio puede costar distinto según el país, la moneda, los
        impuestos y la plataforma. GeoSub ordena precios regionales revisados
        con un criterio común y muestra esas diferencias de forma transparente.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Cada precio incluye fechas de recopilación y de cambio, información
        fiscal y un estado de fiabilidad. Confirma siempre el importe final y la
        disponibilidad en la pantalla oficial de pago.
      </p>
    </SpanishInfoPage>
  );
}
