import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("tr", "streaming");

export default async function TurkishStreamingPricingPage() {
  return <PricingListPage locale="tr" category="streaming" />;
}
