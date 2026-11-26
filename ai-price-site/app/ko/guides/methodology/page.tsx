import CmsBackedGuidePage, {
  getCoreGuideMetadata,
} from "../../../../components/CmsBackedGuidePage";

export function generateMetadata() {
  return getCoreGuideMetadata({ locale: "ko", slug: "methodology" });
}

export default function KoreanMethodologyGuidePage() {
  return <CmsBackedGuidePage locale="ko" slug="methodology" />;
}
