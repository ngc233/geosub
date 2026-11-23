import PricingDetailPage, {
  getPricingDetailMetadata,
  type PricingDetailPageProps,
} from "../../../../components/PricingDetailPage";
import { getPublicPricingProduct } from "../../../../lib/pricing-product-store";
import { getChatGptOverviewSearchDescription, getProductOverviewDecisionPlans } from "../../../../lib/pricing-product-overview-copy";

export const revalidate = 1800;

export async function generateMetadata(props: PricingDetailPageProps) {
  const metadata = await getPricingDetailMetadata({ ...props, locale: "zh" });
  const { slug } = await props.params;
  if (slug !== "chatgpt") return metadata;
  const product = await getPublicPricingProduct(slug, "zh");
  if (!product) return metadata;
  const description = getChatGptOverviewSearchDescription("zh", slug, getProductOverviewDecisionPlans(product));
  return description ? { ...metadata, description } : metadata;
}

export default function ProductPricingPage(props: PricingDetailPageProps) {
  return <PricingDetailPage {...props} locale="zh" routeCategory="ai" />;
}
