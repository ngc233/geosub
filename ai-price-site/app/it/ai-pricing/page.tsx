import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";
export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("it", "ai");
export default async function Page() { return <PricingListPage locale="it" category="ai" />; }
