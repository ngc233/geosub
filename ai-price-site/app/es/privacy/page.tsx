import type { Metadata } from "next";
import SpanishInfoPage from "../../../components/SpanishInfoPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Información sobre la analítica y el tratamiento de datos de uso en GeoSub.",
};

export default function SpanishPrivacyPage() {
  return (
    <SpanishInfoPage
      eyebrow="Política de privacidad"
      title="Política de privacidad"
      description="Explicamos cómo utiliza GeoSub la analítica y cómo trata los datos de uso del sitio."
    >
      <h2 className="text-xl font-black text-zinc-950">Principios básicos</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub publica información de precios y no exige datos personales
        sensibles, como el nombre o documentos de identidad, para consultar el
        sitio.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Podemos utilizar Google Analytics o Google Tag Manager para medir
        visitas, interacciones generales y el rendimiento del sitio. Estas
        mediciones ayudan a mejorar el contenido y la fiabilidad; no se usan
        para solicitar datos de pago ni información sensible de identidad.
      </p>
    </SpanishInfoPage>
  );
}
