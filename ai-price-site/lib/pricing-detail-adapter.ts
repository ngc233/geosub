import {
  type ProductPlan,
  type RegionPrice,
  type SubscriptionProduct,
} from "./public-pricing-model";
import { prisma } from "./prisma";
import type { DetailLocale } from "./detail-page-copy";
import { toTraditionalChinese } from "./traditional-chinese";
import {
  getTaxCalculationPolicy,
  getTaxConfidence,
  getTaxFrontendNote,
  getTaxNote,
  getTaxReviewStatus,
  getTaxSourceKind,
  getTaxTreatment,
} from "./pricing-detail-tax";
import {
  assessAppStoreRisk,
  getLocalizedRiskText,
} from "./pricing-detail-risk";

type PricingDetailRow = {
  product_slug: string;
  product_name: string;
  product_category: string;
  product_provider: string | null;
  product_description: string | null;
  product_logo_url: string | null;
  product_official_url: string | null;
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
  tax_profile_source_kind: string | null;
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
  fx_rate_date: string | null;
  reviewed_at: Date | string | null;
  source_name: string | null;
  confidence_score: number | null;
  data_quality: string | null;
};

const localeMap: Record<DetailLocale, string> = {
  zh: "zh-CN",
  "zh-tw": "zh-TW",
  en: "en",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  tr: "tr-TR",
  ar: "ar",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  pt: "pt-PT",
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

function formatDate(value: Date | string | null) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10);
}

function getLatestDate(values: Array<Date | string | null | undefined>) {
  const latest = values
    .map((value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ? formatDate(latest) : undefined;
}

function getPlanFreshness(regions: RegionPrice[]) {
  const priceCollectedAt = getLatestDate(regions.map((region) => region.lastCheckedAt));
  const fxRateDate = getLatestDate(regions.map((region) => region.fxRateDate));
  const planReviewedAt = getLatestDate(regions.map((region) => region.reviewedAt));
  const sourceNames = [...new Set(regions.map((region) => region.sourceName).filter(Boolean))];
  const minimumConfidence = Math.min(
    ...regions.map((region) => region.confidenceScore ?? 0),
  );
  const qualities = regions.map((region) => region.dataQuality || "unknown");
  const trustStatus = qualities.every((quality) => quality === "verified") && minimumConfidence >= 80
    ? "verified"
    : qualities.every((quality) => quality === "verified" || quality === "estimated") &&
        minimumConfidence >= 60
      ? "reviewed"
      : "needs_review";

  return {
    sourceLabel: sourceNames.length > 0 ? sourceNames.join(" + ") : "App Store",
    priceCollectedAt,
    fxRateDate,
    planReviewedAt,
    pageUpdatedAt: getLatestDate([planReviewedAt, priceCollectedAt]),
    trustStatus,
  } satisfies NonNullable<ProductPlan["freshness"]>;
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
    if (locale === "zh") return "本地价格待核验";
    if (locale === "ja") return "現地価格を確認中";
    if (locale === "ko") return "현지 가격 확인 중";
    if (locale === "es") return "Precio local pendiente de revisión";
    if (locale === "tr") return "Yerel fiyat inceleniyor";
    if (locale === "ar") return "السعر المحلي قيد المراجعة";
    if (locale === "fr") return "Prix local en cours de vérification";
    if (locale === "it") return "Prezzo locale in verifica";
    if (locale === "de") return "Lokaler Preis wird geprüft";
    if (locale === "pt") return "Preço local em verificação";
    return "Local price pending review";
  }

  const monthlySuffix =
    locale === "zh" || locale === "ja" ? "/月"
    : locale === "ko" ? "/월"
    : locale === "es" ? "/mes"
    : locale === "tr" ? "/ay"
    : locale === "ar" ? "/شهر"
    : locale === "fr" ? "/mois"
    : locale === "it" ? "/mese"
    : locale === "de" ? "/Monat"
    : locale === "pt" ? "/mês"
    : "/mo";

  try {
    return `${new Intl.NumberFormat(localeMap[locale] || "en", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
    }).format(number)}${monthlySuffix}`;
  } catch {
    return `${number} ${currency}${monthlySuffix}`;
  }
}

function getPlanBilling(value: string | null): ProductPlan["billing"] {
  if (
    value === "monthly" ||
    value === "yearly" ||
    value === "weekly" ||
    value === "quarterly" ||
    value === "one_time" ||
    value === "lifetime"
  ) {
    return value;
  }
  return "unknown";
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

function buildProductFromRows(
  _productSlug: string,
  rows: PricingDetailRow[],
  locale: DetailLocale,
): SubscriptionProduct | null {
  if (rows.length === 0) {
    return null;
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
      taxSourceKind: getTaxSourceKind(row.tax_profile_source_kind),
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
      lastCheckedAt: formatDate(row.last_checked_at),
      fxRateDate: row.fx_rate_date || undefined,
      reviewedAt: formatDate(row.reviewed_at),
      sourceName: row.source_name || (row.billing_platform === "ios" ? "App Store" : undefined),
      confidenceScore: Number(row.confidence_score || 0),
      dataQuality:
        row.data_quality === "verified" ||
        row.data_quality === "estimated" ||
        row.data_quality === "stale" ||
        row.data_quality === "pending_review"
          ? row.data_quality
          : "unknown",
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
        freshness: getPlanFreshness(regions),
        regions,
      };
    });

  const defaultPlan = plans[0]?.slug || "";
  return {
    slug: firstRow.product_slug,
    category: firstRow.product_category === "streaming" ? "streaming" : "ai",
    name: firstRow.product_name,
    brand: firstRow.product_provider || firstRow.product_name,
    description:
      locale === "ja"
        ? `${firstRow.product_name}のサブスクリプション料金を地域別に比較します。`
        : locale === "ko"
          ? `${firstRow.product_name}의 구독 가격을 지역별로 비교합니다.`
          : locale === "es"
            ? `Compara los precios de suscripción de ${firstRow.product_name} entre regiones.`
            : locale === "tr"
              ? `${firstRow.product_name} abonelik fiyatlarını bölgeler arasında karşılaştırın.`
              : locale === "ar"
                ? `قارن أسعار اشتراك ${firstRow.product_name} بين المناطق.`
              : firstRow.product_description ||
              (locale === "zh"
                ? `比较 ${firstRow.product_name} 不同地区的订阅价格。`
                : `Compare ${firstRow.product_name} subscription prices across regions.`),
    logoUrl: firstRow.product_logo_url || undefined,
    officialUrl: firstRow.product_official_url || undefined,
    defaultPlan,
    updatedAt: plans[0]?.freshness?.pageUpdatedAt || "",
    sourceNote:
      locale === "zh"
        ? "正式价格来自已复核的公开平台地区价格，页面按当前套餐单独计算日期与可信状态。"
        : locale === "ja"
          ? "掲載価格は確認済みの公開地域別価格です。日付と信頼性は、表示中のプランごとに算出しています。"
          : locale === "ko"
            ? "표시 가격은 검토된 공개 지역별 가격입니다. 날짜와 신뢰도는 현재 선택한 요금제를 기준으로 계산합니다."
            : locale === "es"
              ? "Los precios publicados proceden de tarifas regionales públicas revisadas. Las fechas y la fiabilidad se calculan para el plan seleccionado."
              : locale === "tr"
                ? "Yayımlanan fiyatlar incelenmiş bölgesel liste fiyatlarından alınır. Tarihler ve güven durumu seçili paket için ayrı hesaplanır."
                : locale === "ar"
                  ? "تأتي الأسعار المنشورة من أسعار إقليمية عامة خضعت للمراجعة. وتُحسب التواريخ وحالة الموثوقية لكل باقة على حدة."
                : "Published prices come from reviewed public regional pricing. Dates and trust status are calculated for the selected plan.",
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
      p.category::text AS product_category,
      p.provider AS product_provider,
      p.description AS product_description,
      p.logo_url AS product_logo_url,
      p.official_url AS product_official_url,
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
      tax_profile.source_kind AS tax_profile_source_kind,
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
      rp.last_checked_at,
      latest_observation.raw_payload ->> 'fx_rate_date' AS fx_rate_date,
      latest_observation.reviewed_at,
      source.name AS source_name,
      rp.confidence_score,
      rp.data_quality::text AS data_quality
    FROM products p
    JOIN plans pl ON pl.product_id = p.id
    JOIN region_prices rp
      ON rp.product_id = p.id
      AND rp.plan_id = pl.id
      AND rp.status = 'published'
      AND rp.price_usd IS NOT NULL
    JOIN countries c ON c.id = rp.country_id
    LEFT JOIN price_sources source ON source.id = rp.primary_source_id
    LEFT JOIN country_tax_profiles tax_profile
      ON tax_profile.country_id = c.id
      AND tax_profile.status = 'active'
    LEFT JOIN country_app_store_risk_profiles risk_profile
      ON risk_profile.country_id = c.id
      AND risk_profile.status = 'active'
    LEFT JOIN LATERAL (
      SELECT
        po.raw_payload,
        COALESCE(
          NULLIF(po.raw_payload ->> 'approved_at', '')::timestamptz,
          NULLIF(po.raw_payload ->> 'auto_approved_at', '')::timestamptz,
          po.updated_at
        ) AS reviewed_at
      FROM price_observations po
      WHERE po.product_id = p.id
        AND po.plan_id = pl.id
        AND po.country_id = rp.country_id
        AND po.billing_platform = rp.billing_platform
        AND (
          po.status = 'approved'
          OR (
            po.status = 'ignored'
            AND po.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price'
          )
        )
      ORDER BY po.observed_at DESC, po.created_at DESC
      LIMIT 1
    ) latest_observation ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS pending_observation_count
      FROM price_observations po
      WHERE po.product_id = p.id
        AND po.plan_id = pl.id
        AND po.status = 'pending'
    ) pending ON TRUE
    WHERE p.slug = ${productSlug}
      AND p.status = 'published'
      AND p.category IN ('ai'::product_category, 'streaming'::product_category)
      AND pl.status = 'published'
    ORDER BY pl.sort_order ASC, rp.price_usd ASC, rp.billing_platform ASC
  `;

  const product = buildProductFromRows(
    productSlug,
    rows,
    locale === "zh-tw" ? "zh" : locale,
  );

  return locale === "zh-tw" ? toTraditionalChinese(product) : product;
}
