import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("ar", "ai");

export default async function ArabicAiPricingPage() {
  return <PricingListPage locale="ar" category="ai" />;
}
