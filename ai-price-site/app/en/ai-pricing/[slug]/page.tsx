import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "en" });
}

export default function EnglishProductPricingPage(
  props: PricingDetailPageProps,
) {
  return <PricingDetailPage {...props} locale="en" routeCategory="ai" />;
}
