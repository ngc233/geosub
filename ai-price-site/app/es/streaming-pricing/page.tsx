import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;
export const metadata = getPricingListMetadata("es", "streaming");

export default async function SpanishStreamingPricingPage() {
  return <PricingListPage locale="es" category="streaming" />;
}
