import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "zh-tw" });
}

export default function Page(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="zh-tw" routeCategory="streaming" />;
}
