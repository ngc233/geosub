import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh", slug: "methodology" });
}

export default function MethodologyPage() {
  return <CmsBackedGuidePage locale="zh" slug="methodology" />;
}
