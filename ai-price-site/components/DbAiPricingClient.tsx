"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DbPricingCard from "./DbPricingCard";
import { groupPricingProductsByCycle } from "../lib/db-pricing-types";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import type { ProductPlan } from "../lib/public-pricing-model";
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
  canvas?: boolean;
};

export default function DbAiPricingClient({
  products,
  locale,
  canvas = false,
}: DbAiPricingClientProps) {
  const ui = (name: string, legacy: string) => canvas ? name : legacy;
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
        <div className={ui("gs-listing-tabs", "mb-10 flex justify-center")}>
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

      <div className={ui("gs-listing-sectionhead", "mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between")}>
        <div>
          <div className={ui("", "flex flex-wrap items-center gap-3")}>
            <h2 className={ui("", "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white")}>
              {activeTab.label}
            </h2>

          </div>

          <p className={ui("", "mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400")}>
            {activeTab.desc}
          </p>
        </div>

        <div className={ui("gs-listing-count", "text-sm font-medium text-zinc-400 dark:text-zinc-500")}>
          {copy.productCount(filteredProducts.length)}
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <>
          {groupPricingProductsByCycle(filteredProducts)
            .map(({ cycle, products: cycleProducts }) => <section key={cycle} className={ui("gs-listing-cycle", "mb-8")}>
              <h3 className={ui("", "mb-4 text-lg font-semibold text-[var(--color-text-primary)]")}>
                {getBillingCycleLabel(cycle.toLowerCase() as ProductPlan["billing"], locale)}
              </h3>
              <div className={ui("gs-listing-grid", "grid grid-cols-1 gap-5 overflow-visible xl:grid-cols-2")}>
                {cycleProducts.map(product => <DbPricingCard key={product.slug} product={product} locale={locale} canvas={canvas} />)}
              </div>
            </section>)}

          {directoryCopy ? (
            <nav
              aria-label={directoryCopy.title}
              className={ui("gs-listing-directory", "mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800")}
            >
              <h2 className={ui("", "text-base font-semibold text-zinc-950 dark:text-white")}>
                {directoryCopy.title}
              </h2>
              <p className={ui("", "mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400")}>
                {directoryCopy.description}
              </p>
              <div className={ui("", "mt-4 flex flex-wrap gap-2")}>
                {filteredProducts.map((product) => (
                  <Link
                    key={`${product.slug}-overview`}
                    href={getPricingDetailPath(locale, product.category, product.slug)}
                    className={ui("", "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white")}
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <div className={ui("gs-listing-empty", "rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500")}>
          {copy.empty}
        </div>
      )}
    </>
  );
}
