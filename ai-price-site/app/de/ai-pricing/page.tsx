import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";
export const dynamic = "force-dynamic";
export const metadata = getPricingListMetadata("de", "ai");
export default async function Page() { return <PricingListPage locale="de" category="ai" />; }
