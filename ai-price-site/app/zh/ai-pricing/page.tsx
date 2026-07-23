import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("zh", "ai");

export default async function AiPricingPage() {
  return <PricingListPage locale="zh" category="ai" />;
}
