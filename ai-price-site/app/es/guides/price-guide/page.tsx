import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "es", slug: "price-guide" });
}

export default function SpanishPriceGuidePage() {
  return <CmsBackedGuidePage locale="es" slug="price-guide" />;
}
