import type { Metadata } from "next";
import SpanishInfoPage from "../../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Métodos de pago y región de la cuenta",
  description:
    "Qué debes comprobar sobre pagos, facturación y cuenta antes de contratar en otra región.",
};

export default function SpanishPaymentAccountPage() {
  return (
    <SpanishInfoPage
      eyebrow="Pago y cuenta"
      title="Métodos de pago y región de la cuenta"
      description="Que exista una diferencia de precio no significa que todas las regiones permitan contratar con las mismas condiciones."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Una compra en App Store puede depender del país o la región de la
          cuenta de Apple, los métodos de pago aceptados, los datos de
          facturación, el saldo y la disponibilidad del servicio.
        </p>
        <p>
          GeoSub compara precios públicos y no recomienda eludir restricciones
          regionales. Revisa las condiciones oficiales y el importe final antes
          de comprar.
        </p>
      </div>
    </SpanishInfoPage>
  );
}
