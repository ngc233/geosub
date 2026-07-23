import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("en", "streaming");

export default async function EnglishStreamingPricingPage() {
  return <PricingListPage locale="en" category="streaming" />;
}
