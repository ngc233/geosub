import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "pt" });
}

export default function PortugueseAiPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="pt" routeCategory="ai" />;
}
