import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ar" });
}

export default function ArabicProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="ar" routeCategory="ai" />;
}
