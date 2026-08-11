import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("ar", "streaming");

export default async function ArabicStreamingPricingPage() {
  return <PricingListPage locale="ar" category="streaming" />;
}
