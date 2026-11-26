import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "zh-tw", slug: "methodology" });
}

export default function TraditionalChineseMethodologyGuidePage() {
  return <CmsBackedGuidePage locale="zh-tw" slug="methodology" />;
}
