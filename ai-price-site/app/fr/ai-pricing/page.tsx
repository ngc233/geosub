import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";
export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("fr", "ai");
export default async function Page() { return <PricingListPage locale="fr" category="ai" />; }
