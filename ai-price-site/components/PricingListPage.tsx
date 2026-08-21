import { ProductCategory } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getDbAiPricingProducts } from "../lib/db-ai-pricing";
import { getPricingListCopy } from "../lib/pricing-list-copy";
import type { ProductCategory as PublicProductCategory } from "../lib/public-pricing-model";
import {
  PUBLIC_PRICING_CACHE_TAG,
  PUBLIC_PRICING_LIST_CACHE_TAG,
  PUBLIC_PRICING_REVALIDATE_SECONDS,
} from "../lib/public-pricing-cache";
import type { SiteLocale } from "../lib/site-locale";
import DbAiPricingClient from "./DbAiPricingClient";

const dbCategoryByPublicCategory: Record<
  PublicProductCategory,
  ProductCategory
> = {
  ai: ProductCategory.AI,
  streaming: ProductCategory.STREAMING,
};

function getCachedPricingListProducts(
  locale: SiteLocale,
  category: PublicProductCategory,
) {
  return unstable_cache(
    () => getDbAiPricingProducts({
      locale,
      categories: [dbCategoryByPublicCategory[category]],
      compactForListing: true,
    }),
    ["public-pricing-list", locale, category],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_LIST_CACHE_TAG],
    },
  )();
}

export default async function PricingListPage({
  locale,
  category,
}: {
  locale: SiteLocale;
  category: PublicProductCategory;
}) {
  const products = await getCachedPricingListProducts(locale, category);
  const copy = getPricingListCopy(locale).pages[category];

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          {copy.eyebrow}
        </p>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          {copy.title}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>

      <DbAiPricingClient products={products} locale={locale} />
    </main>
  );
}
