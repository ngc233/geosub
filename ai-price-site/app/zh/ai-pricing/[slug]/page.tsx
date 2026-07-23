import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "zh" });
}

export default function ProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="zh" />;
}
