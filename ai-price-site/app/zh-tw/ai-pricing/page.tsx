import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("zh-tw", "ai");

export default function Page() {
  return <PricingListPage locale="zh-tw" category="ai" />;
}
