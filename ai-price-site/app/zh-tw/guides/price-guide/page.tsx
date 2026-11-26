import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh-tw", slug: "price-guide" });
}

export default function TraditionalChinesePriceGuidePage() {
  return <CmsBackedGuidePage locale="zh-tw" slug="price-guide" />;
}
