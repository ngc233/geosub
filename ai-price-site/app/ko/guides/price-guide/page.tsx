import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ko", slug: "price-guide" });
}

export default function KoreanPriceGuidePage() {
  return <CmsBackedGuidePage locale="ko" slug="price-guide" />;
}
