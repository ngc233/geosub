import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "tr" });
}

export default function TurkishProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="tr" />;
}
