import "../../public-listing.css";
import PricingListPage from "../../../components/PricingListPage";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const revalidate = 1800;

export const metadata = {
  ...getPricingListMetadata("en", "software"),
  robots: { index: false, follow: false },
};

export default async function SoftwarePricingPage() {
  return <PricingListPage locale="en" category="software" />;
}
