import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "pt" });
}

export default function PortugueseStreamingPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="pt" />;
}
