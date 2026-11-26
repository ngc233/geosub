import type { Metadata } from "next";
import UnifiedHomepageCanvas from "../../components/UnifiedHomepageCanvas";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Precios mundiales de suscripciones digitales",
  description:
    "Compara suscripciones de IA y streaming entre países y regiones, con precios locales, conversión a la moneda elegida, información fiscal y poder adquisitivo.",
};

export default function SpanishPage() {
  return <UnifiedHomepageCanvas locale="es" />;
}
