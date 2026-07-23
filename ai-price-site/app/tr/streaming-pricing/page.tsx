import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("tr", "streaming");

export default async function TurkishStreamingPricingPage() {
  return <PricingListPage locale="tr" category="streaming" />;
}
