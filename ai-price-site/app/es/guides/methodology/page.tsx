import type { Metadata } from "next";
import SpanishInfoPage from "../../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Metodología de los datos de precios",
  description:
    "Cómo recopila GeoSub los precios regionales, separa las anomalías y publica los datos revisados.",
};

export default function SpanishMethodologyPage() {
  return (
    <SpanishInfoPage
      eyebrow="Metodología"
      title="Metodología de los datos de precios"
      description="Comparamos precios equivalentes y mantenemos las anomalías fuera de las clasificaciones públicas."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Recopilamos los precios por producto, plan, país o región, moneda y
          ciclo de facturación. Verificamos que las observaciones repetidas sean
          estables y aislamos posibles errores de moneda, decimales o
          periodicidad.
        </p>
        <p>
          Las páginas públicas solo muestran datos revisados. La fecha de
          recopilación, la fecha del tipo de cambio, la revisión del plan y la
          actualización de la página tienen significados distintos y se
          presentan por separado.
        </p>
      </div>
    </SpanishInfoPage>
  );
}
