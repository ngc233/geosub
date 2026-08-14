import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh", slug: "payment-account" });
}

export default function PaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="zh" slug="payment-account" />;
}
