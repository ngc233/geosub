import type { Metadata } from "next";
import SpanishInfoPage from "../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Fuentes de datos y método de comparación",
  description:
    "Conoce cómo utiliza GeoSub los precios de App Store, los tipos de cambio, la información fiscal y las revisiones.",
};

export default function SpanishDataSourcesPage() {
  return (
    <SpanishInfoPage
      eyebrow="Fuentes de datos"
      title="Fuentes de datos y método de comparación"
      description="Las clasificaciones públicas de GeoSub se basan en precios regionales de suscripciones de App Store que han sido revisados."
    >
      <h2 className="text-xl font-black text-zinc-950">
        Cómo tratamos los precios
      </h2>
      <div className="mt-4 space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Guardamos por separado el producto, el plan, el país o la región, la
          moneda y el ciclo de facturación. Los importes anómalos o los posibles
          errores de moneda, decimales o periodicidad no se publican y pasan a
          revisión automática.
        </p>
        <p>
          Las conversiones a USD y CNY utilizan el tipo de cambio de la fecha
          indicada. La información fiscal sirve de orientación: GeoSub no añade
          de nuevo un porcentaje de impuestos al precio mostrado por App Store.
        </p>
        <p className="text-zinc-500">
          Los precios y la disponibilidad pueden cambiar. El importe final, los
          impuestos y las condiciones de compra que muestra la pantalla oficial
          de pago son los que prevalecen.
        </p>
      </div>
    </SpanishInfoPage>
  );
}
