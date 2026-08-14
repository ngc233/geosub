import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "en", slug: "methodology" });
}

export default function MethodologyPage() {
  return <CmsBackedGuidePage locale="en" slug="methodology" />;
}
