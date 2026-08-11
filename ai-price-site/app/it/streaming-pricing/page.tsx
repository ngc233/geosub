import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";
export const revalidate = 1800;
export const metadata = getPricingListMetadata("it", "streaming");
export default async function Page() { return <PricingListPage locale="it" category="streaming" />; }
