import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("tr", "ai");

export default async function TurkishAiPricingPage() {
  return <PricingListPage locale="tr" category="ai" />;
}
