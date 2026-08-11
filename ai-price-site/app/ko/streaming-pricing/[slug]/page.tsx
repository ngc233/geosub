import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ko" });
}

export default function KoreanStreamingDetailPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="ko" routeCategory="streaming" />;
}
