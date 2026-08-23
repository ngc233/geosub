import { unstable_cache } from "next/cache";

import HomepageExperience, { type HomepageProduct } from "./HomepageExperience";
import {
  getDbAiPricingProducts,
  getDbHomepagePricingEvidence,
} from "../lib/db-ai-pricing";
import { getDefaultPlan } from "../lib/db-pricing-types";
import type { SiteLocale } from "../lib/site-locale";

const FEATURED_PRODUCT_SLUGS = [
  "chatgpt",
  "claude",
  "gemini",
  "netflix",
  "disney",
  "hbo-max",
] as const;

const getHomepageProducts = unstable_cache(
  async (locale: SiteLocale) => Promise.all([
    getDbAiPricingProducts({ locale, productSlugs: FEATURED_PRODUCT_SLUGS }),
    getDbHomepagePricingEvidence(),
  ]),
  ["localized-homepage-products"],
  { revalidate: 1800, tags: ["pricing-products", "homepage-pricing"] },
);

function getProductHref(locale: SiteLocale, category: HomepageProduct["category"], slug: string) {
  const section = category === "streaming" ? "streaming-pricing" : "ai-pricing";
  return `/${locale}/${section}/${slug}/`;
}

async function loadHomepageData(locale: SiteLocale) {
  try {
    const [allProducts, evidence] = await getHomepageProducts(locale);
    const compactProducts = allProducts.flatMap<HomepageProduct>((product) => {
      const plan = getDefaultPlan(product);
      if (!plan || plan.regions.length === 0) return [];
      return [{
        slug: product.slug,
        name: product.name,
        category: product.category,
        planName: plan.name,
        href: getProductHref(locale, product.category, product.slug),
        updatedAt: product.updatedAt,
        logoUrl: product.logoUrl,
        regions: plan.regions.map((region) => ({
          code: region.code,
          countryName: region.countryName,
          priceUsd: region.priceUsd,
          localPrice: region.localPrice,
          tax: region.taxNote,
        })),
      }];
    });

    const featured = FEATURED_PRODUCT_SLUGS.flatMap((slug) => {
      const product = compactProducts.find((item) => item.slug === slug);
      return product ? [product] : [];
    });
    return {
      products: featured.length >= 3 ? featured : compactProducts.slice(0, 6),
      evidence,
    };
  } catch (error) {
    console.error(`Failed to load the ${locale} homepage pricing experience`, error);
    return {
      products: [] as HomepageProduct[],
      evidence: { products: 0, regions: 0, prices: 0, updatedAt: new Date().toISOString() },
    };
  }
}

export default async function LocalizedHomepagePage({ locale }: { locale: SiteLocale }) {
  const { products, evidence } = await loadHomepageData(locale);
  return <HomepageExperience locale={locale} products={products} evidence={evidence} />;
}
