import {
  subscriptionPricingData,
  type ProductPlan,
  type RegionPrice,
  type SubscriptionProduct,
} from "../data/ai-pricing";
import { prisma } from "./prisma";
import type { DetailLocale } from "./detail-page-copy";

type PricingDetailRow = {
  product_slug: string;
  product_name: string;
  plan_slug: string;
  plan_name: string;
  billing_cycle: string | null;
  plan_description: string | null;
  plan_sort_order: number | null;

  country_code: string;
  country_name_zh: string | null;
  country_name_en: string | null;
  is_reference: boolean | null;

  local_price: unknown;
  currency: string | null;
  price_usd: unknown;
  diff_vs_us_percent: unknown;
  tax_note: string | null;
  availability_note: string | null;
  billing_platform: string | null;
  last_checked_at: Date | string | null;
};

const localeMap: Record<DetailLocale, string> = {
  zh: "zh-CN",
  en: "en",
  es: "es",
  ja: "ja",
  ko: "ko",
  de: "de",
  fr: "fr",
  ar: "ar",
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

function getStaticProduct(productSlug: string) {
  return subscriptionPricingData.find((product) => product.slug === productSlug) || null;
}

function getCountryName(
  countryCode: string,
  fallbackZh: string | null,
  fallbackEn: string | null,
  locale: DetailLocale,
) {
  try {
    const displayNames = new Intl.DisplayNames([localeMap[locale] || "en"], {
      type: "region",
    });

    const localizedName = displayNames.of(countryCode.toUpperCase());

    if (localizedName) {
      return localizedName;
    }
  } catch {
    // fallback below
  }

  if (locale === "zh") {
    return fallbackZh || fallbackEn || countryCode;
  }

  return fallbackEn || fallbackZh || countryCode;
}

function formatLocalPrice(value: unknown, currency: string | null, locale: DetailLocale) {
  const number = toNumber(value);

  if (!currency || number <= 0) {
    return "本地价格待核实";
  }

  try {
    return `${new Intl.NumberFormat(localeMap[locale] || "en", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
    }).format(number)}/mo`;
  } catch {
    return `${number} ${currency}/mo`;
  }
}

function getPlanBilling(value: string | null): ProductPlan["billing"] {
  return value === "yearly" ? "yearly" : "monthly";
}

function getBillingPlatformLabel(value: string | null) {
  const platform = (value || "unknown").toLowerCase();

  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  if (platform === "web") return "Web";
  if (platform === "steam") return "Steam";
  if (platform === "gift_card") return "Gift Card";

  return "Unknown";
}

function buildProductFromRows(
  productSlug: string,
  rows: PricingDetailRow[],
  locale: DetailLocale,
): SubscriptionProduct | null {
  const staticProduct = getStaticProduct(productSlug);

  if (rows.length === 0) {
    return staticProduct;
  }

  const firstRow = rows[0];
  const planMap = new Map<
    string,
    {
      slug: string;
      name: string;
      billing: ProductPlan["billing"];
      description?: string;
      sortOrder: number;
      regions: RegionPrice[];
    }
  >();

  rows.forEach((row) => {
    const planSlug = row.plan_slug;

    if (!planMap.has(planSlug)) {
      planMap.set(planSlug, {
        slug: planSlug,
        name: row.plan_name,
        billing: getPlanBilling(row.billing_cycle),
        description: row.plan_description || undefined,
        sortOrder: row.plan_sort_order || 0,
        regions: [],
      });
    }

    const diffPercent = toNumber(row.diff_vs_us_percent);
    const countryCode = row.country_code.toUpperCase();

    planMap.get(planSlug)?.regions.push({
      rank: 0,
      country: getCountryName(
        countryCode,
        row.country_name_zh,
        row.country_name_en,
        locale,
      ),
      code: countryCode,
      priceUsd: toNumber(row.price_usd),
      localPrice: formatLocalPrice(row.local_price, row.currency, locale),
      tax: row.tax_note || "",
      billingPlatform: row.billing_platform || "unknown",
      billingPlatformLabel: getBillingPlatformLabel(row.billing_platform),
      isReference: Boolean(row.is_reference) || countryCode === "US",
      isCheap: diffPercent < -5,
      isExpensive: diffPercent > 18,
    });
  });

  const plans = [...planMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((plan) => {
      const regions = [...plan.regions]
        .sort((a, b) => a.priceUsd - b.priceUsd)
        .map((region, index) => ({
          ...region,
          rank: index + 1,
        }));

      return {
        slug: plan.slug,
        name: plan.name,
        billing: plan.billing,
        description: plan.description,
        regions,
      };
    });

  const defaultPlan =
    staticProduct?.defaultPlan && plans.some((plan) => plan.slug === staticProduct.defaultPlan)
      ? staticProduct.defaultPlan
      : plans[0]?.slug || staticProduct?.defaultPlan || "plus";

  return {
    slug: firstRow.product_slug,
    category: staticProduct?.category || "ai",
    name: staticProduct?.name || firstRow.product_name,
    brand: staticProduct?.brand || firstRow.product_name,
    description:
      staticProduct?.description ||
      `比较 ${firstRow.product_name} 不同地区的订阅价格。`,
    icon: staticProduct?.icon,
    accentIcon: staticProduct?.accentIcon,
    defaultPlan,
    updatedAt: staticProduct?.updatedAt || "2026-06",
    sourceNote: "价格数据来自 GeoSub 数据库；缺失产品会回退到静态示例数据。",
    plans,
  };
}

export async function getPricingDetailProduct(
  productSlug: string,
  locale: DetailLocale = "zh",
) {
  const rows = await prisma.$queryRaw<PricingDetailRow[]>`
    SELECT
      p.slug AS product_slug,
      p.name AS product_name,
      pl.slug AS plan_slug,
      pl.name AS plan_name,
      pl.billing_cycle::text AS billing_cycle,
      pl.description AS plan_description,
      pl.sort_order AS plan_sort_order,

      c.code AS country_code,
      c.name_zh AS country_name_zh,
      c.name_en AS country_name_en,
      c.is_reference AS is_reference,

      rp.local_price,
      rp.currency,
      rp.price_usd,
      rp.diff_vs_us_percent,
      rp.tax_note,
      rp.availability_note,
      rp.billing_platform::text AS billing_platform,
      rp.last_checked_at
    FROM region_prices rp
    JOIN products p ON p.id = rp.product_id
    JOIN plans pl ON pl.id = rp.plan_id
    JOIN countries c ON c.id = rp.country_id
    WHERE p.slug = ${productSlug}
      AND rp.status = 'published'
      AND pl.status = 'published'
      AND rp.price_usd IS NOT NULL
    ORDER BY pl.sort_order ASC, rp.price_usd ASC, rp.billing_platform ASC
  `;

  return buildProductFromRows(productSlug, rows, locale);
}