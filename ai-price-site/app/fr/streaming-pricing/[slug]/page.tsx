import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "fr" });
}

export default function FrenchStreamingPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="fr" />;
}
