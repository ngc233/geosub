import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "en", slug: "payment-account" });
}

export default function PaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="en" slug="payment-account" />;
}
