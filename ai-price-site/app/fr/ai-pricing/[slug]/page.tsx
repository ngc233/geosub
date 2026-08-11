import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "fr" });
}

export default function FrenchAiPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="fr" routeCategory="ai" />;
}
