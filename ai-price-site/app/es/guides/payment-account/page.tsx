import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "es", slug: "payment-account" });
}

export default function SpanishPaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="es" slug="payment-account" />;
}
