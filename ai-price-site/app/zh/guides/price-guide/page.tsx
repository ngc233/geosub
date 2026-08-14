import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh", slug: "price-guide" });
}

export default function PriceGuidePage() {
  return <CmsBackedGuidePage locale="zh" slug="price-guide" />;
}
