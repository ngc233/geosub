import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ja" });
}

export default function JapaneseProductPricingPage(
  props: PricingDetailPageProps,
) {
  return <PricingDetailPage {...props} locale="ja" />;
}
