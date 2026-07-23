import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("ko", "ai");

export default async function KoreanAiPricingPage() {
  return <PricingListPage locale="ko" category="ai" />;
}
