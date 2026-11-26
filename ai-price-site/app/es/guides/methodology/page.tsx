import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "es", slug: "methodology" });
}

export default function SpanishMethodologyGuidePage() {
  return <CmsBackedGuidePage locale="es" slug="methodology" />;
}
