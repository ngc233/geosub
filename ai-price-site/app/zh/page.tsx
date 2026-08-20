import { unstable_cache } from "next/cache";

import HomepageExperience, {
  type HomepageEvidence,
  type HomepageProduct,
} from "../../components/HomepageExperience";
import { getDbAiPricingProducts } from "../../lib/db-ai-pricing";
import { getDefaultPlan } from "../../lib/db-pricing-types";

const FEATURED_PRODUCT_SLUGS = [
  "chatgpt",
  "claude",
  "gemini",
  "netflix",
  "disney",
  "hbo-max",
] as const;

const getHomepageProducts = unstable_cache(
  async () => getDbAiPricingProducts({ locale: "zh" }),
  ["zh-homepage-products"],
  { revalidate: 1800, tags: ["pricing-products", "homepage-pricing"] },
);

function getProductHref(category: HomepageProduct["category"], slug: string) {
  return `/${category === "streaming" ? "zh/streaming-pricing" : "zh/ai-pricing"}/${slug}/`;
}

async function loadHomepageData() {
  try {
    const allProducts = await getHomepageProducts();
    const compactProducts = allProducts.flatMap<HomepageProduct>((product) => {
      const plan = getDefaultPlan(product);
      if (!plan || plan.regions.length === 0) return [];
      return [{
        slug: product.slug,
        name: product.name,
        category: product.category,
        planName: plan.name,
        href: getProductHref(product.category, product.slug),
        updatedAt: product.updatedAt,
        logoUrl: product.logoUrl,
        regions: plan.regions.map((region) => ({
          code: region.code,
          countryName: region.countryName,
          priceUsd: region.priceUsd,
        })),
      }];
    });

    const featured = FEATURED_PRODUCT_SLUGS.flatMap((slug) => {
      const product = compactProducts.find((item) => item.slug === slug);
      return product ? [product] : [];
    });
    const products = featured.length >= 3 ? featured : compactProducts.slice(0, 6);
    const evidence: HomepageEvidence = {
      products: compactProducts.length,
      regions: new Set(compactProducts.flatMap((product) => product.regions.map((region) => region.code))).size,
      prices: compactProducts.reduce((sum, product) => sum + product.regions.length, 0),
      updatedAt:
        compactProducts
          .map((product) => product.updatedAt)
          .sort((a, b) => b.localeCompare(a))[0] || new Date().toISOString(),
    };

    return { products, evidence };
  } catch (error) {
    console.error("Failed to load the Chinese homepage pricing experience", error);
    return {
      products: [] as HomepageProduct[],
      evidence: { products: 0, regions: 0, prices: 0, updatedAt: new Date().toISOString() },
    };
  }
}

export default async function ZhHomePage() {
  const { products, evidence } = await loadHomepageData();
  return <HomepageExperience products={products} evidence={evidence} />;
}
