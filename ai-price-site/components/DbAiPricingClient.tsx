"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DbPricingCard from "./DbPricingCard";
import SegmentedControl from "./ui/SegmentedControl";
import type {
  DbPricingCategory,
  DbPricingProduct,
} from "../lib/db-pricing-types";
import { getPricingListCopy } from "../lib/pricing-list-copy";
import { getPricingDetailPath } from "../lib/pricing-routes";
import { isSeoIndexableLocale } from "../lib/seo-indexing-policy";
import type { PreparedSiteLocale } from "../lib/site-locale";

const overviewDirectoryCopy = {
  zh: {
    title: "按产品查看全部套餐",
    description: "进入产品总览，比较该产品已发布的全部套餐与地区价格。",
  },
  en: {
    title: "Browse all plans by product",
    description:
      "Open a product overview to compare every published plan and its regional prices.",
  },
} as const;

type DbAiPricingClientProps = {
  products: DbPricingProduct[];
  locale: PreparedSiteLocale;
};

export default function DbAiPricingClient({
  products,
  locale,
}: DbAiPricingClientProps) {
  const copy = getPricingListCopy(locale);
  const tabs = useMemo(
    () => [
      {
        key: "ai" as DbPricingCategory,
        label: copy.aiLabel,
        desc: copy.aiDescription,
      },
      {
        key: "streaming" as DbPricingCategory,
        label: copy.streamingLabel,
        desc: copy.streamingDescription,
      },
    ],
    [copy],
  );
  const availableTabs = useMemo(
    () =>
      tabs.filter((tab) =>
        products.some((product) => product.category === tab.key),
      ),
    [products, tabs],
  );
  const defaultCategory = availableTabs[0]?.key || tabs[0].key;
  const [selectedCategory, setSelectedCategory] =
    useState<DbPricingCategory>(defaultCategory);
  const activeCategory = availableTabs.some(
    (tab) => tab.key === selectedCategory,
  )
    ? selectedCategory
    : defaultCategory;

  const activeTab =
    tabs.find((tab) => tab.key === activeCategory) || tabs[0];
  const directoryCopy = isSeoIndexableLocale(locale)
    ? overviewDirectoryCopy[locale]
    : null;

  const filteredProducts = useMemo(
    () => products.filter((product) => product.category === activeCategory),
    [products, activeCategory]
  );

  return (
    <>
      {availableTabs.length > 1 ? (
        <div className="mb-10 flex justify-center">
          <SegmentedControl
            ariaLabel={copy.categoryAria}
            value={activeCategory}
            tone="green"
            items={availableTabs.map((tab) => ({
              label: tab.label,
              value: tab.key,
            }))}
            onChange={(value) => setSelectedCategory(value as DbPricingCategory)}
          />
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {activeTab.label}
            </h2>
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
              {copy.defaultPlanHint}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {activeTab.desc}
          </p>
        </div>

        <div className="text-sm font-bold text-zinc-400">
          {copy.productCount(filteredProducts.length)}
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-8 overflow-visible xl:grid-cols-2">
            {filteredProducts.map((product) => (
              <DbPricingCard
                key={product.slug}
                product={product}
                locale={locale}
              />
            ))}
          </div>

          {directoryCopy ? (
            <nav
              aria-label={directoryCopy.title}
              className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800"
            >
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                {directoryCopy.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {directoryCopy.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {filteredProducts.map((product) => (
                  <Link
                    key={`${product.slug}-overview`}
                    href={getPricingDetailPath(locale, product.category, product.slug)}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-lime-400 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-lime-600 dark:hover:text-white"
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
          {copy.empty}
        </div>
      )}
    </>
  );
}
