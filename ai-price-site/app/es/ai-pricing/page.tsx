import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("es", "ai");

export default async function SpanishAiPricingPage() {
  return <PricingListPage locale="es" category="ai" />;
}
