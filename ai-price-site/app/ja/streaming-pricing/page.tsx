import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("ja", "streaming");

export default async function JapaneseStreamingPricingPage() {
  return <PricingListPage locale="ja" category="streaming" />;
}
