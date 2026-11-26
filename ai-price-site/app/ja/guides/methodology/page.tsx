import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ja", slug: "methodology" });
}

export default function JapaneseMethodologyGuidePage() {
  return <CmsBackedGuidePage locale="ja" slug="methodology" />;
}
