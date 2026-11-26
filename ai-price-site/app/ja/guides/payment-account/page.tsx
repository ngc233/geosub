import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ja", slug: "payment-account" });
}

export default function JapanesePaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="ja" slug="payment-account" />;
}
