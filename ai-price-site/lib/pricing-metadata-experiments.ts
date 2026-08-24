import type { PlanStats } from "./public-pricing-model";
import type { SiteLocale } from "./site-locale";

export const CHATGPT_PRO_5X_METADATA_EXPERIMENT_ID =
  "en-chatgpt-pro-5x-2026-08-25";
export const CHATGPT_PLUS_BING_METADATA_EXPERIMENT_ID =
  "zh-chatgpt-plus-bing-2026-08-25";

type PricingMetadataExperiment = {
  id: string;
  title: string;
  description: string;
  heroDescription?: string;
};

function formatRoundedUsd(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatExactUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getPricingMetadataExperiment({
  locale,
  productSlug,
  planSlug,
  displayName,
  stats,
  regionCount,
}: {
  locale: SiteLocale;
  productSlug: string;
  planSlug: string;
  displayName: string;
  stats: PlanStats | null;
  regionCount: number;
}): PricingMetadataExperiment | null {
  if (!stats) return null;

  if (
    locale === "zh" &&
    productSlug === "chatgpt" &&
    planSlug === "plus"
  ) {
    const lowestPrice = formatExactUsd(stats.minRegion.priceUsd);
    const referencePrice = formatExactUsd(stats.referenceRegion.priceUsd);
    const year = new Date().getFullYear();

    return {
      id: CHATGPT_PLUS_BING_METADATA_EXPERIMENT_ID,
      title: `${displayName} 多少钱？${regionCount}个地区价格对比（${year}）`,
      description: `${displayName} 月费最低约 ${lowestPrice}（${stats.minRegion.country}），美国基准 ${referencePrice}。比较 ${regionCount} 个已核验地区的当地价格、税费、汇率与购买力，数据持续更新。`,
      heroDescription: `比较 ${regionCount} 个已核验地区的 ${displayName} 月费：当前最低约 ${lowestPrice}（${stats.minRegion.country}），美国基准 ${referencePrice}；并查看当地货币、税费、汇率与购买力。`,
    };
  }

  if (
    locale === "en" &&
    productSlug === "chatgpt" &&
    planSlug === "pro-5x"
  ) {
    return {
      id: CHATGPT_PRO_5X_METADATA_EXPERIMENT_ID,
      title: `${displayName} Prices: ${formatRoundedUsd(stats.minRegion.priceUsd)}–${formatRoundedUsd(stats.maxRegion.priceUsd)} in ${regionCount} Regions`,
      description: `${displayName} App Store prices range from ${formatExactUsd(stats.minRegion.priceUsd)} in ${stats.minRegion.country} to ${formatExactUsd(stats.maxRegion.priceUsd)} in ${stats.maxRegion.country}. Compare ${regionCount} reviewed regions, tax, FX and affordability.`,
    };
  }

  return null;
}
