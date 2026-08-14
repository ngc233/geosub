import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh", slug: "gift-card-guide" });
}

export default function GiftCardGuidePage() {
  return <CmsBackedGuidePage locale="zh" slug="gift-card-guide" />;
}
