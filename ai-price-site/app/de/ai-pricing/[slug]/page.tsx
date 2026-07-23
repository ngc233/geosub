import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "de" });
}

export default function GermanAiPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="de" />;
}
