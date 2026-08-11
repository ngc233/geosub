import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "de" });
}

export default function GermanStreamingPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="de" routeCategory="streaming" />;
}
