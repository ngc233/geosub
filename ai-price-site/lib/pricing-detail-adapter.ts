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
  pending_observation_count: number;

  country_code: string | null;
  country_name_zh: string | null;
  country_name_en: string | null;
  is_reference: boolean | null;

  local_price: unknown;
  currency: string | null;
  price_usd: unknown;
  diff_vs_us_percent: unknown;
  tax_note: string | null;
  tax_profile_note_zh: string | null;
  tax_profile_note_en: string | null;
  tax_profile_confidence: string | null;
  tax_profile_is_variable: boolean | null;
  tax_profile_treatment: string | null;
  tax_profile_calculation_policy: string | null;
  tax_profile_review_status: string | null;
  tax_profile_frontend_note_zh: string | null;
  tax_profile_frontend_note_en: string | null;
  risk_level: string | null;
  risk_base_score: unknown;
  risk_factors_zh: string | null;
  risk_factors_en: string | null;
  risk_note_zh: string | null;
  risk_note_en: string | null;
  risk_requirements_zh: string | null;
  risk_requirements_en: string | null;
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
  if (platform === "google_play") return "Google Play";
  if (platform === "web") return "Web";
  if (platform === "steam") return "Steam";
  if (platform === "gift_card") return "Gift Card";

  return "Unknown";
}

function getTaxNote({
  taxNote,
  taxProfileNoteZh,
  taxProfileNoteEn,
  billingPlatform,
  locale,
}: {
  taxNote: string | null;
  taxProfileNoteZh: string | null;
  taxProfileNoteEn: string | null;
  billingPlatform: string | null;
  locale: DetailLocale;
}) {
  const note = taxNote?.trim();

  if (note) {
    return note;
  }

  const profileNote =
    locale === "zh" ? taxProfileNoteZh?.trim() : taxProfileNoteEn?.trim();

  if (profileNote) {
    return profileNote;
  }

  const platform = (billingPlatform || "unknown").toLowerCase();

  if (platform === "ios") {
    return "App Store 标价，税费以结算页为准";
  }

  if (platform === "android" || platform === "google_play") {
    return "Google Play 标价，税费以结算页为准";
  }

  if (platform === "web") {
    return "官网标价，税费以结算页为准";
  }

  return "税费待核实";
}

function getTaxConfidence(value: string | null): RegionPrice["taxConfidence"] {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
}

function getTaxTreatment(value: string | null): RegionPrice["taxTreatment"] {
  if (
    value === "included_likely" ||
    value === "varies_by_region" ||
    value === "checkout_may_add" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function getTaxCalculationPolicy(value: string | null): RegionPrice["taxCalculationPolicy"] {
  if (value === "do_not_calculate" || value === "informational_only") {
    return value;
  }

  return "do_not_calculate";
}

function getTaxReviewStatus(value: string | null): RegionPrice["taxReviewStatus"] {
  if (value === "verified" || value === "needs_review" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function getTaxFrontendNote({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  return (locale === "zh" ? zh?.trim() : en?.trim()) || "";
}

function getRiskLevel(value: string | null): RegionPrice["riskLevel"] {
  if (value === "low" || value === "medium" || value === "high" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function getRiskLevelFromScore(score: number): RegionPrice["riskLevel"] {
  if (score <= 54) return "low";
  if (score <= 79) return "medium";
  return "high";
}

function clampRiskScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevelLabel(level: RegionPrice["riskLevel"], locale: DetailLocale) {
  if (locale !== "zh") {
    if (level === "low") return "Low";
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Unverified";
  }

  if (level === "low") return "低";
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "待核实";
}

function assessAppStoreRisk({
  baseLevel,
  baseScore,
  baseFactors,
  baseNote,
  requirements,
  diffPercent,
  taxConfidence,
  taxVariable,
  billingPlatform,
  locale,
}: {
  baseLevel: string | null;
  baseScore: unknown;
  baseFactors?: string;
  baseNote?: string;
  requirements?: string;
  diffPercent: number;
  taxConfidence: string | null;
  taxVariable: boolean | null;
  billingPlatform: string | null;
  locale: DetailLocale;
}) {
  const factors: string[] = [];
  let score = toNumber(baseScore);

  if (score <= 0) {
    const level = getRiskLevel(baseLevel);
    score = level === "low" ? 40 : level === "high" ? 82 : level === "medium" ? 60 : 72;
  }

  if (baseFactors) factors.push(baseFactors);

  const platform = (billingPlatform || "unknown").toLowerCase();
  if (platform !== "ios") {
    score += 8;
    factors.push(
      locale === "zh"
        ? "当前不是 App Store 来源，风险模型只作参考。"
        : "This is not an App Store source, so the risk model is only indicative.",
    );
  }

  if (diffPercent <= -30) {
    score += 16;
    factors.push(
      locale === "zh"
        ? "价格显著低于美国，跨区订阅时更需要关注付款和账号限制。"
        : "The price is far below the US reference, so payment and account restrictions deserve extra attention.",
    );
  } else if (diffPercent <= -22) {
    score += 8;
    factors.push(
      locale === "zh"
        ? "价格明显低于美国，建议以结算页能否完成为准。"
        : "The price is clearly below the US reference; rely on checkout completion.",
    );
  }

  if (taxVariable) {
    score += 4;
    factors.push(
      locale === "zh"
        ? "税费按州或省变化，结算价可能和展示价略有差异。"
        : "Taxes vary by state or province, so checkout price may differ slightly.",
    );
  }

  if (taxConfidence === "low") {
    score += 8;
    factors.push(locale === "zh" ? "税费资料可信度较低。" : "Tax profile confidence is low.");
  } else if (taxConfidence === "medium") {
    score += 3;
  }

  const finalScore = clampRiskScore(score);
  const finalLevel = getRiskLevelFromScore(finalScore);
  const noteParts = [requirements, baseNote].filter(Boolean);
  const riskNote =
    noteParts.join(" ") ||
    (locale === "zh"
      ? "跨区订阅可能受到 Apple ID 地区、付款方式、账单信息和平台风控影响。"
      : "Cross-region subscription may be affected by Apple ID region, payment method, billing information, and platform risk controls.");

  return {
    level: finalLevel,
    score: finalScore,
    note: `${riskNote} ${locale === "zh" ? "模型判断：" : "Model rating: "}${getRiskLevelLabel(finalLevel, locale)} (${finalScore}/100).`,
    factors: factors.join(locale === "zh" ? " " : " "),
  };
}

function getLocalizedRiskText({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  const value = locale === "zh" ? zh?.trim() : en?.trim();
  const fallback = locale === "zh" ? en?.trim() : zh?.trim();

  return value || fallback || undefined;
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
      pendingObservationCount: number;
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
        pendingObservationCount: Number(row.pending_observation_count || 0),
        regions: [],
      });
    }

    if (!row.country_code || row.price_usd === null || row.local_price === null || !row.currency) {
      return;
    }

    const diffPercent = toNumber(row.diff_vs_us_percent);
    const countryCode = row.country_code.toUpperCase();
    const riskBaseNote = getLocalizedRiskText({
      zh: row.risk_note_zh,
      en: row.risk_note_en,
      locale,
    });
    const riskRequirements = getLocalizedRiskText({
      zh: row.risk_requirements_zh,
      en: row.risk_requirements_en,
      locale,
    });
    const assessedRisk = assessAppStoreRisk({
      baseLevel: row.risk_level,
      baseScore: row.risk_base_score,
      baseFactors: getLocalizedRiskText({
        zh: row.risk_factors_zh,
        en: row.risk_factors_en,
        locale,
      }),
      baseNote: riskBaseNote,
      requirements: riskRequirements,
      diffPercent,
      taxConfidence: row.tax_profile_confidence,
      taxVariable: row.tax_profile_is_variable,
      billingPlatform: row.billing_platform,
      locale,
    });

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
      tax: getTaxNote({
        taxNote: row.tax_note,
        taxProfileNoteZh: row.tax_profile_note_zh,
        taxProfileNoteEn: row.tax_profile_note_en,
        billingPlatform: row.billing_platform,
        locale,
      }),
      taxConfidence: getTaxConfidence(row.tax_profile_confidence),
      taxTreatment: getTaxTreatment(row.tax_profile_treatment),
      taxCalculationPolicy: getTaxCalculationPolicy(row.tax_profile_calculation_policy),
      taxReviewStatus: getTaxReviewStatus(row.tax_profile_review_status),
      taxFrontendNote: getTaxFrontendNote({
        zh: row.tax_profile_frontend_note_zh,
        en: row.tax_profile_frontend_note_en,
        locale,
      }),
      riskLevel: assessedRisk.level,
      riskScore: assessedRisk.score,
      riskNote: assessedRisk.note,
      riskRequirements,
      riskFactors: assessedRisk.factors,
      billingPlatform: row.billing_platform || "unknown",
      billingPlatformLabel: getBillingPlatformLabel(row.billing_platform),
      isReference: Boolean(row.is_reference) || countryCode === "US",
      isCheap: diffPercent < -5,
      isExpensive: diffPercent > 18,
    });
  });

  const plans = [...planMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map<ProductPlan>((plan) => {
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
        priceStatus:
          regions.length > 0
            ? "published"
            : plan.pendingObservationCount > 0
              ? "pending"
              : "empty",
        pendingObservationCount: plan.pendingObservationCount,
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
      COALESCE(pending.pending_observation_count, 0)::int AS pending_observation_count,

      c.code AS country_code,
      c.name_zh AS country_name_zh,
      c.name_en AS country_name_en,
      c.is_reference AS is_reference,

      rp.local_price,
      rp.currency,
      rp.price_usd,
      rp.diff_vs_us_percent,
      rp.tax_note,
      tax_profile.display_note_zh AS tax_profile_note_zh,
      tax_profile.display_note_en AS tax_profile_note_en,
      tax_profile.confidence AS tax_profile_confidence,
      tax_profile.is_variable_by_region AS tax_profile_is_variable,
      tax_profile.app_store_tax_treatment AS tax_profile_treatment,
      tax_profile.price_calculation_policy AS tax_profile_calculation_policy,
      tax_profile.review_status AS tax_profile_review_status,
      tax_profile.frontend_note_zh AS tax_profile_frontend_note_zh,
      tax_profile.frontend_note_en AS tax_profile_frontend_note_en,
      risk_profile.risk_level AS risk_level,
      risk_profile.base_risk_score AS risk_base_score,
      risk_profile.risk_factors_zh AS risk_factors_zh,
      risk_profile.risk_factors_en AS risk_factors_en,
      risk_profile.display_note_zh AS risk_note_zh,
      risk_profile.display_note_en AS risk_note_en,
      risk_profile.requirements_zh AS risk_requirements_zh,
      risk_profile.requirements_en AS risk_requirements_en,
      rp.availability_note,
      rp.billing_platform::text AS billing_platform,
      rp.last_checked_at
    FROM products p
    JOIN plans pl ON pl.product_id = p.id
    LEFT JOIN region_prices rp
      ON rp.product_id = p.id
      AND rp.plan_id = pl.id
      AND rp.status = 'published'
      AND rp.price_usd IS NOT NULL
    LEFT JOIN countries c ON c.id = rp.country_id
    LEFT JOIN country_tax_profiles tax_profile
      ON tax_profile.country_id = c.id
      AND tax_profile.status = 'active'
    LEFT JOIN country_app_store_risk_profiles risk_profile
      ON risk_profile.country_id = c.id
      AND risk_profile.status = 'active'
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS pending_observation_count
      FROM price_observations po
      WHERE po.product_id = p.id
        AND po.plan_id = pl.id
        AND po.status = 'pending'
    ) pending ON TRUE
    WHERE p.slug = ${productSlug}
      AND pl.status = 'published'
    ORDER BY pl.sort_order ASC, rp.price_usd ASC, rp.billing_platform ASC
  `;

  return buildProductFromRows(productSlug, rows, locale);
}
