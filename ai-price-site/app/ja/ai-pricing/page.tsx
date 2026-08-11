import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;

export const metadata = getPricingListMetadata("ja", "ai");

export default async function JapaneseAiPricingPage() {
  return <PricingListPage locale="ja" category="ai" />;
}
