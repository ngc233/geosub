import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "it" });
}

export default function ItalianAiPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="it" />;
}
