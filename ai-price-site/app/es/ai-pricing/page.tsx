import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("es", "ai");

export default async function SpanishAiPricingPage() {
  return <PricingListPage locale="es" category="ai" />;
}
