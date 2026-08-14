import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "en", slug: "price-guide" });
}

export default function PriceGuidePage() {
  return <CmsBackedGuidePage locale="en" slug="price-guide" />;
}
