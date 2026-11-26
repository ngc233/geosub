import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ko", slug: "payment-account" });
}

export default function KoreanPaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="ko" slug="payment-account" />;
}
