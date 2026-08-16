import type { CountryPagePilot } from "./country-page-pilot.ts";

export const COUNTRY_PAGE_MAX_PRICE_AGE_DAYS = 14;
export const COUNTRY_PAGE_MAX_RATE_AGE_HOURS = 18;
export const COUNTRY_PAGE_MIN_PRICE_CONFIDENCE = 80;

export type CountryPagePriceEvidence = {
  planSlug: string;
  planName: string;
  localPrice: number;
  currency: string;
  billingCycle: string;
  billingPlatform: string;
  priceType: string;
  confidenceScore: number;
  dataQuality: string;
  lastCheckedAt: string | Date | null;
  sourceUrl: string | null;
  observationStatus: string | null;
  observationConfidenceScore: number | null;
  anomalyFlag: boolean | null;
};

export type CountryPageExchangeEvidence = {
  rate: number;
  source: string | null;
  rateDate: string | Date | null;
  fetchedAt: string | Date | null;
};

export type CountryPageTaxEvidence = {
  confidence: string | null;
  reviewStatus: string | null;
  sourceKind: string | null;
};

export type CountryPageSearchEvidence = {
  clicks: number;
  impressions: number;
  latestPeriodEnd: string | null;
  engines: string[];
};

export type CountryPageReadinessInput = {
  pilot: CountryPagePilot;
  prices: CountryPagePriceEvidence[];
  exchangeRate: CountryPageExchangeEvidence | null;
  taxProfile: CountryPageTaxEvidence | null;
  searchEvidence: CountryPageSearchEvidence;
  now?: Date;
};

export type CountryPageReadinessResult = {
  key: string;
  status: "ready" | "blocked";
  blockers: string[];
  warnings: string[];
  planCount: number;
  searchEvidence: CountryPageSearchEvidence;
  evidence: {
    oldestPriceCheckedAt: string | null;
    exchangeRateFetchedAt: string | null;
    taxConfidence: string | null;
    taxReviewStatus: string | null;
    exactSourceCount: number;
  };
  checks: {
    prices: boolean;
    sources: boolean;
    exchangeRate: boolean;
    tax: boolean;
    demand: boolean;
    event: boolean;
    editorial: boolean;
  };
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: string | Date | null | undefined) {
  return toDate(value)?.toISOString() || null;
}

function ageHours(value: string | Date | null | undefined, now: Date) {
  const date = toDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.max(0, now.getTime() - date.getTime()) / 3_600_000;
}

function isAppStoreUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "apps.apple.com";
  } catch {
    return false;
  }
}

function parseExpectedLocalPrice(value: string) {
  const match = /^([A-Z]{3})\s+([\d,.]+)$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[2].replace(/,/g, ""));
  return Number.isFinite(amount)
    ? { currency: match[1], amount }
    : null;
}

function isEditorialComplete(pilot: CountryPagePilot) {
  return (
    pilot.title.zh.length >= 8
    && pilot.title.en.length >= 20
    && pilot.description.zh.length >= 20
    && pilot.description.en.length >= 50
    && pilot.decisionSummary.zh.length >= 35
    && pilot.decisionSummary.en.length >= 80
    && pilot.localContext.zh.length >= 25
    && pilot.localContext.en.length >= 60
    && pilot.availabilityCaution.zh.length >= 25
    && pilot.availabilityCaution.en.length >= 60
  );
}

export function evaluateCountryPageReadiness({
  pilot,
  prices,
  exchangeRate,
  taxProfile,
  searchEvidence,
  now = new Date(),
}: CountryPageReadinessInput): CountryPageReadinessResult {
  const blockers = [...(pilot.releaseBlockers || [])];
  const warnings: string[] = [];
  const key = `${pilot.productSlug}:${pilot.countryCode}`;

  const validPrices = prices.filter((price) => (
    normalize(price.billingCycle) === "monthly"
    && normalize(price.billingPlatform) === "ios"
    && normalize(price.priceType) === "list_price"
    && price.localPrice > 0
    && price.currency.length === 3
  ));
  const priceRowsComplete = validPrices.length > 0 && validPrices.length === prices.length;
  if (prices.length === 0) blockers.push("price.no_published_monthly_ios_rows");
  else if (!priceRowsComplete) blockers.push("price.invalid_monthly_ios_row");

  const weakPrices = validPrices.filter((price) => (
    normalize(price.dataQuality) !== "verified"
    || price.confidenceScore < COUNTRY_PAGE_MIN_PRICE_CONFIDENCE
  ));
  if (weakPrices.length > 0) blockers.push("price.not_fully_verified");

  const stalePrices = validPrices.filter((price) => (
    ageHours(price.lastCheckedAt, now) > COUNTRY_PAGE_MAX_PRICE_AGE_DAYS * 24
  ));
  if (stalePrices.length > 0) blockers.push("price.older_than_14_days");

  const invalidObservations = validPrices.filter((price) => (
    !["approved", "ignored"].includes(normalize(price.observationStatus))
    || (price.observationConfidenceScore ?? 0) < COUNTRY_PAGE_MIN_PRICE_CONFIDENCE
    || Boolean(price.anomalyFlag)
  ));
  if (invalidObservations.length > 0) {
    blockers.push("price.latest_observation_not_publishable");
  }

  const sourcesReady = validPrices.length > 0
    && validPrices.every((price) => isAppStoreUrl(price.sourceUrl));
  if (!sourcesReady) blockers.push("source.missing_exact_app_store_url");

  const rateReady = Boolean(
    exchangeRate
    && exchangeRate.rate > 0
    && exchangeRate.source
    && ageHours(exchangeRate.fetchedAt, now) <= COUNTRY_PAGE_MAX_RATE_AGE_HOURS,
  );
  if (!exchangeRate || exchangeRate.rate <= 0 || !exchangeRate.source) {
    blockers.push("fx.missing_reference_rate");
  } else if (!rateReady) {
    blockers.push("fx.older_than_18_hours");
  }

  const taxReady = Boolean(
    taxProfile
    && ["high", "medium"].includes(normalize(taxProfile.confidence))
    && normalize(taxProfile.reviewStatus) === "verified",
  );
  if (!taxProfile) blockers.push("tax.missing_profile");
  else if (!taxReady) blockers.push("tax.not_verified_medium_or_high");

  const hasSearchDemand = searchEvidence.impressions > 0;
  const demandReady = hasSearchDemand || pilot.evidenceKind === "price_event";
  if (!demandReady) blockers.push("demand.no_observed_search_or_price_event");
  if (!hasSearchDemand && pilot.evidenceKind === "price_event") {
    warnings.push("demand.price_event_only");
  }

  let eventReady = true;
  if (pilot.priceEvent) {
    const expected = parseExpectedLocalPrice(pilot.priceEvent.currentLocalPrice);
    const eventPrice = validPrices.find(
      (price) => price.planSlug === pilot.priceEvent?.planSlug,
    );
    eventReady = Boolean(
      expected
      && eventPrice
      && eventPrice.currency === expected.currency
      && Math.abs(eventPrice.localPrice - expected.amount) < 0.005
      && isAppStoreUrl(pilot.priceEvent.sourceUrl),
    );
    if (!eventReady) blockers.push("event.current_price_or_source_mismatch");
  }

  const editorialReady = isEditorialComplete(pilot);
  if (!editorialReady) blockers.push("editorial.incomplete_bilingual_copy");

  return {
    key,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    planCount: validPrices.length,
    searchEvidence,
    evidence: {
      oldestPriceCheckedAt: validPrices
        .map((price) => toIso(price.lastCheckedAt))
        .filter((value): value is string => Boolean(value))
        .sort()[0] || null,
      exchangeRateFetchedAt: toIso(exchangeRate?.fetchedAt),
      taxConfidence: taxProfile?.confidence || null,
      taxReviewStatus: taxProfile?.reviewStatus || null,
      exactSourceCount: validPrices.filter((price) => isAppStoreUrl(price.sourceUrl)).length,
    },
    checks: {
      prices: priceRowsComplete
        && weakPrices.length === 0
        && stalePrices.length === 0
        && invalidObservations.length === 0,
      sources: sourcesReady,
      exchangeRate: rateReady,
      tax: taxReady,
      demand: demandReady,
      event: eventReady,
      editorial: editorialReady,
    },
  };
}
