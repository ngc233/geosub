import { createHash } from "node:crypto";
import type { ExchangeRateSnapshot } from "./exchange-rates";
import type { RegionPrice, SubscriptionProduct } from "./public-pricing-model";
import type { SiteLocale } from "./site-locale";

export type PricingReportSourceStatus =
  | "official"
  | "linked"
  | "named"
  | "unlinked";

export type PricingReportRow = {
  planSlug: string;
  planName: string;
  billingCycle: string;
  region: string;
  regionCode: string;
  localPrice: number;
  localCurrency: string;
  usdEquivalent: number;
  differenceVsUsPercent: number | null;
  taxTreatment: string;
  taxNote: string;
  lastVerified: string | null;
  exchangeRateDate: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceStatus: PricingReportSourceStatus;
  dataQuality: string;
};

export type PricingReportDataset = {
  schemaVersion: "1.0";
  locale: SiteLocale;
  productSlug: string;
  productName: string;
  productCategory: string;
  reportTitle: string;
  canonicalPageUrl: string;
  canonicalReportUrl: string;
  generatedAt: string;
  lastUpdated: string | null;
  exchangeRateUpdatedAt: string | null;
  snapshotId: string;
  datasetVersion: string;
  pricingSources: Array<{ name: string; url: string | null; status: PricingReportSourceStatus }>;
  exchangeRateSources: Array<{ name: string; date: string | null }>;
  rows: PricingReportRow[];
  citation: string;
};

function dateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function latestDate(values: Array<string | null | undefined>) {
  return values
    .map(dateOnly)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || null;
}

function sourceStatus(region: RegionPrice): PricingReportSourceStatus {
  const source = `${region.sourceName || ""} ${region.sourceUrl || ""}`.toLowerCase();
  if (region.sourceUrl && /(apps\.apple\.com|openai\.com|netflix\.com|google\.com|spotify\.com|disneyplus\.com|max\.com)/.test(source)) {
    return "official";
  }
  if (region.sourceUrl) return "linked";
  if (region.sourceName) return "named";
  return "unlinked";
}

function differencePercent(price: number, reference: number | null) {
  if (!reference || reference <= 0) return null;
  return ((price - reference) / reference) * 100;
}

function datasetDateSlug(value: string | null, fallback: string) {
  return (value || fallback).replaceAll("-", "").slice(0, 8);
}

const localizedReportTitle: Record<SiteLocale, (productName: string) => string> = {
  zh: (name) => `${name} 全球价格报告`,
  "zh-tw": (name) => `${name} 全球價格報告`,
  en: (name) => `${name} Global Pricing Report`,
  ja: (name) => `${name} 世界価格レポート`,
  ko: (name) => `${name} 글로벌 가격 보고서`,
  es: (name) => `Informe global de precios de ${name}`,
  tr: (name) => `${name} Küresel Fiyat Raporu`,
  ar: (name) => `تقرير الأسعار العالمي لـ ${name}`,
  fr: (name) => `Rapport mondial des prix de ${name}`,
  it: (name) => `Rapporto globale sui prezzi di ${name}`,
  de: (name) => `Globaler Preisbericht für ${name}`,
  pt: (name) => `Relatório global de preços do ${name}`,
};

const reportIntlLocale: Record<SiteLocale, string> = {
  zh: "zh-CN", "zh-tw": "zh-TW", en: "en-US", ja: "ja-JP", ko: "ko-KR",
  es: "es-ES", tr: "tr-TR", ar: "ar", fr: "fr-FR", it: "it-IT", de: "de-DE", pt: "pt-PT",
};

export function buildPricingReportDataset({
  product,
  exchangeRates,
  locale = "en",
  generatedAt = new Date(),
  siteOrigin = "https://geosub.org",
}: {
  product: SubscriptionProduct;
  exchangeRates: Record<string, ExchangeRateSnapshot>;
  locale?: SiteLocale;
  generatedAt?: Date;
  siteOrigin?: string;
}): PricingReportDataset {
  const plans = product.plans.filter((plan) => plan.regions.length > 0);
  const rows = plans.flatMap((plan) => {
    const usPrice = plan.regions.find((region) => region.code.toUpperCase() === "US")?.priceUsd || null;
    return plan.regions.map<PricingReportRow>((region) => ({
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle: plan.billing,
      region: region.country,
      regionCode: region.code.toUpperCase(),
      localPrice: region.localPriceValue ?? region.priceUsd,
      localCurrency: region.currencyCode || "USD",
      usdEquivalent: region.priceUsd,
      differenceVsUsPercent: differencePercent(region.priceUsd, usPrice),
      taxTreatment: region.taxTreatment || "unknown",
      taxNote: region.taxFrontendNote || region.tax || "No tax note available",
      lastVerified: dateOnly(region.lastCheckedAt),
      exchangeRateDate: dateOnly(region.fxRateDate),
      sourceName: region.sourceName || "Source not linked",
      sourceUrl: region.sourceUrl || null,
      sourceStatus: sourceStatus(region),
      dataQuality: region.dataQuality || "unknown",
    }));
  });

  const pricingSources = [...new Map(
    rows.map((row) => [
      `${row.sourceName}|${row.sourceUrl || ""}`,
      { name: row.sourceName, url: row.sourceUrl, status: row.sourceStatus },
    ]),
  ).values()];
  const exchangeRateSources = [...new Map(
    Object.values(exchangeRates)
      .filter((rate) => rate.source)
      .map((rate) => [
        `${rate.source}|${rate.rateDate || ""}`,
        { name: rate.source || "Unknown FX provider", date: rate.rateDate },
      ]),
  ).values()];
  const lastUpdated = latestDate(rows.map((row) => row.lastVerified));
  const exchangeRateUpdatedAt = latestDate([
    ...rows.map((row) => row.exchangeRateDate),
    ...Object.values(exchangeRates).map((rate) => rate.rateDate),
  ]);
  const generatedIso = generatedAt.toISOString();
  const canonicalPageUrl = `${siteOrigin}/${locale}/${product.category === "streaming" ? "streaming-pricing" : "ai-pricing"}/${product.slug}`;
  const canonicalReportUrl = `${siteOrigin}/reports/${locale}/${product.slug}-global-pricing.pdf`;
  const fingerprintRows = rows.map((row) => ({
    planSlug: row.planSlug,
    billingCycle: row.billingCycle,
    regionCode: row.regionCode,
    localPrice: row.localPrice,
    localCurrency: row.localCurrency,
    usdEquivalent: row.usdEquivalent,
    differenceVsUsPercent: row.differenceVsUsPercent,
    taxTreatment: row.taxTreatment,
    lastVerified: row.lastVerified,
    exchangeRateDate: row.exchangeRateDate,
    sourceUrl: row.sourceUrl,
    sourceStatus: row.sourceStatus,
    dataQuality: row.dataQuality,
  }));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ product: product.slug, rows: fingerprintRows, exchangeRateSources }))
    .digest("hex");
  const snapshotId = `geosub-${product.slug}-${datasetDateSlug(lastUpdated, generatedIso)}-${fingerprint.slice(0, 10)}`;
  const datasetVersion = `geosub-${product.slug}-${datasetDateSlug(lastUpdated, generatedIso)}`;
  const generatedLabel = new Intl.DateTimeFormat(reportIntlLocale[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(generatedAt);

  return {
    schemaVersion: "1.0",
    locale,
    productSlug: product.slug,
    productName: product.name,
    productCategory: product.category,
    reportTitle: localizedReportTitle[locale](product.name),
    canonicalPageUrl,
    canonicalReportUrl,
    generatedAt: generatedIso,
    lastUpdated,
    exchangeRateUpdatedAt,
    snapshotId,
    datasetVersion,
    pricingSources,
    exchangeRateSources,
    rows,
    citation: locale === "zh"
      ? `GeoSub：《${product.name} 全球价格报告》，GeoSub.org，生成于 ${generatedLabel}。${canonicalReportUrl}`
      : locale === "zh-tw"
        ? `GeoSub：《${product.name} 全球價格報告》，GeoSub.org，生成於 ${generatedLabel}。${canonicalReportUrl}`
        : `GeoSub. ${localizedReportTitle[locale](product.name)}. GeoSub.org, ${generatedLabel}. ${canonicalReportUrl}`,
  };
}
