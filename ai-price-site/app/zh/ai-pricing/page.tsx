import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;

export const metadata = getPricingListMetadata("zh", "ai");

export default async function AiPricingPage() {
  return <PricingListPage locale="zh" category="ai" />;
}
