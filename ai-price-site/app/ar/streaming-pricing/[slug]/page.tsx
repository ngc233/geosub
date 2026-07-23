import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: PricingDetailPageProps) {
  return getPricingDetailMetadata({ ...props, locale: "ar" });
}

export default function ArabicStreamingDetailPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="ar" />;
}
