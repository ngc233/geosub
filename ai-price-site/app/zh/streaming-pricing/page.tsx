import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("zh", "streaming");

export default async function StreamingPricingPage() {
  return <PricingListPage locale="zh" category="streaming" />;
}
