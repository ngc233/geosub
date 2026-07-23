import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("en", "ai");

export default async function EnglishAiPricingPage() {
  return <PricingListPage locale="en" category="ai" />;
}
