import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("ko", "streaming");

export default async function KoreanStreamingPricingPage() {
  return <PricingListPage locale="ko" category="streaming" />;
}
