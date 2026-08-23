import type { Metadata } from "next";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata: Metadata = {
  title: "Precios mundiales de suscripciones digitales",
  description: "Compara suscripciones de IA y streaming entre países y regiones, con precios locales, conversión a la moneda elegida, información fiscal y poder adquisitivo.",
};

export default function SpanishPage() {
  return <LocalizedHomepagePage locale="es" />;
}
