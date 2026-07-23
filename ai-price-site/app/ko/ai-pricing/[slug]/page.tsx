import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ko" });
}

export default function KoreanProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="ko" />;
}
