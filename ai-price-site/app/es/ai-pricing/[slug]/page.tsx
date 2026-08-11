import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "es" });
}

export default function SpanishProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="es" routeCategory="ai" />;
}
