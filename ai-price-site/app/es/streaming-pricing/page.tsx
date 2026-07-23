import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("es", "streaming");

export default async function SpanishStreamingPricingPage() {
  return <PricingListPage locale="es" category="streaming" />;
}
