import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh-tw", slug: "payment-account" });
}

export default function TraditionalChinesePaymentAccountGuidePage() {
  return <CmsBackedGuidePage locale="zh-tw" slug="payment-account" />;
}
