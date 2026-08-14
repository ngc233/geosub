import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "en", slug: "gift-card-guide" });
}

export default function GiftCardGuidePage() {
  return <CmsBackedGuidePage locale="en" slug="gift-card-guide" />;
}
