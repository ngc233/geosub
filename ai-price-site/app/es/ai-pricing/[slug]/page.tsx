import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "es" });
}

export default function SpanishProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="es" />;
}
