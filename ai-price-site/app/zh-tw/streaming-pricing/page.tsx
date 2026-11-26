import "../../public-listing.css";
import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;

export const metadata = getPricingListMetadata("zh-tw", "streaming");

export default function TraditionalChineseStreamingPricingPage() {
  return <PricingListPage locale="zh-tw" category="streaming" />;
}
