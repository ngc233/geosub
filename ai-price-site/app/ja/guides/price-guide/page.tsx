import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ja", slug: "price-guide" });
}

export default function JapanesePriceGuidePage() {
  return <CmsBackedGuidePage locale="ja" slug="price-guide" />;
}
