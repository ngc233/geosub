import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const revalidate = 1800;

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ja" });
}

export default function StreamingPricingPage(props: PricingDetailPageProps) {
  return (
    <PricingDetailPage
      {...props}
      locale="ja"
      routeCategory="streaming"
    />
  );
}
