import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "tr" });
}

export default function TurkishProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="tr" routeCategory="ai" />;
}
