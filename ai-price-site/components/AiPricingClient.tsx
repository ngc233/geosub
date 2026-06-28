"use client";

import { useMemo, useState } from "react";
import PricingCard from "./PricingCard";
import SegmentedControl from "./ui/SegmentedControl";
import type {
  ProductCategory,
  SubscriptionProduct,
} from "../lib/ai-pricing-model";

type AiPricingClientProps = {
  products: SubscriptionProduct[];
  locale: "zh" | "en";
};

const copy = {
  zh: {
    tabs: [
      {
        key: "ai" as ProductCategory,
        label: "AI 订阅",
        desc: "比较 ChatGPT、Claude、Gemini、Grok 等 AI 产品在不同国家和地区的价格。",
      },
      {
        key: "streaming" as ProductCategory,
        label: "流媒体",
        desc: "比较 Netflix、YouTube Premium、Spotify、Disney+ 等流媒体和数字娱乐订阅价格。",
      },
    ],
    countPrefix: "当前收录",
    countSuffix: "个产品",
    empty: "当前分类暂无已发布价格数据。",
  },
  en: {
    tabs: [
      {
        key: "ai" as ProductCategory,
        label: "AI Subscriptions",
        desc: "Compare ChatGPT, Claude, Gemini, Grok and other AI subscription prices across countries and regions.",
      },
      {
        key: "streaming" as ProductCategory,
        label: "Streaming",
        desc: "Compare Netflix, YouTube Premium, Spotify, Disney+ and other digital entertainment subscription prices.",
      },
    ],
    countPrefix: "Currently tracking",
    countSuffix: "products",
    empty: "No published pricing data is available for this category yet.",
  },
};

export default function AiPricingClient({
  products,
  locale,
}: AiPricingClientProps) {
  const currentCopy = copy[locale];
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ai");

  const activeTab =
    currentCopy.tabs.find((tab) => tab.key === activeCategory) ||
    currentCopy.tabs[0];

  const filteredProducts = useMemo(
    () => products.filter((product) => product.category === activeCategory),
    [products, activeCategory]
  );

  return (
    <>
      <div className="mb-10 flex justify-center">
        <SegmentedControl
          ariaLabel={locale === "en" ? "Digital service category" : "数字服务分类"}
          value={activeCategory}
          tone="green"
          items={currentCopy.tabs.map((tab) => ({
            label: tab.label,
            value: tab.key,
          }))}
          onChange={(value) => setActiveCategory(value as ProductCategory)}
        />
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {activeTab.label}
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {activeTab.desc}
          </p>
        </div>

        <div className="text-sm font-bold text-zinc-400">
          {currentCopy.countPrefix} {filteredProducts.length} {currentCopy.countSuffix}
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 overflow-visible xl:grid-cols-2">
          {filteredProducts.map((product) => (
            <PricingCard
              key={product.slug}
              product={product}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
          {currentCopy.empty}
        </div>
      )}
    </>
  );
}