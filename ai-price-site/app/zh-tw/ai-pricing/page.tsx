import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("zh-tw", "ai");

export default function Page() {
  return <PricingListPage locale="zh-tw" category="ai" />;
}
