"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatUsd,
  getPlanStats,
  type ProductPlan,
  type RegionPrice,
} from "../lib/public-pricing-model";
import ExpandableRegionPriceTable from "./ExpandableRegionPriceTable";
import PriceWorldMap from "./PriceWorldMap";
import {
  MetricItem,
  MetricStrip,
  PublicSection,
  PublicSectionHeader,
} from "./ui/PublicPage";
import { getPlanDisplayName } from "../lib/pricing-labels";
import { getPublicPricingCopy } from "../lib/public-pricing-copy";
import {
  getSiteLocaleDefinition,
  type SiteLocale,
} from "../lib/site-locale";

type PlatformFilter = "ios" | "web" | "android" | "all";
type DisplayCurrency = "usd" | "cny";

type CurrencyExchangeRate = {
  rate: number;
  source?: string | null;
  rateDate?: string | null;
  fetchedAt?: string | null;
  isFallback?: boolean;
  isStale?: boolean;
};

type PricingPlatformViewProps = {
  productName: string;
  plan: ProductPlan;
  cnyExchangeRate?: CurrencyExchangeRate;
  shareAction?: ReactNode;
  locale?: SiteLocale;
};

const currencyOptions: Array<{ value: DisplayCurrency }> = [
  { value: "usd" },
  { value: "cny" },
];

const UNAVAILABLE_CNY_PER_USD = 0;

function getPlatform(region: RegionPrice) {
  const platform = (region.billingPlatform || "unknown").toLowerCase();
  return platform === "google_play" ? "android" : platform;
}

function getSortedRegions(plan: ProductPlan) {
  return [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd);
}

function getReferenceRegion(plan: ProductPlan) {
  return (
    plan.regions.find((region) => region.code.toUpperCase() === "US") ||
    getSortedRegions(plan)[0]
  );
}

function getDiffPercent(price: number, referencePrice: number) {
  if (referencePrice <= 0) return 0;
  return Math.round(((price - referencePrice) / referencePrice) * 100);
}

function getSignedPercent(diffPercent: number) {
  if (diffPercent === 0) return "0%";
  if (diffPercent > 0) return `+${diffPercent}%`;
  return `${diffPercent}%`;
}

function getPlatformLabel(platform: PlatformFilter, locale: SiteLocale = "zh") {
  const copy = getPublicPricingCopy(locale).pricing;
  if (platform === "ios") return "App Store";
  if (platform === "web") return copy.officialWebPricing;
  if (platform === "android") return "Google Play";
  if (platform === "all") return copy.allDiagnosticSources;
  return copy.allSources;
}

function getCurrencyLabel(
  currency: DisplayCurrency,
  locale: SiteLocale = "zh",
) {
  const copy = getPublicPricingCopy(locale).pricing;
  if (currency === "cny") {
    return copy.cnyLabel;
  }

  return copy.usdLabel;
}

function formatSyncDate(value: string | null | undefined, locale: SiteLocale) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat(getSiteLocaleDefinition(locale).htmlLang, {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-");
}

function getCnyRateNote(
  cnyExchangeRate: CurrencyExchangeRate,
  cnyRate: number,
  locale: SiteLocale,
) {
  const copy = getPublicPricingCopy(locale).pricing;
  const syncedDate = formatSyncDate(cnyExchangeRate.fetchedAt, locale);
  const basisDate = cnyExchangeRate.rateDate || null;

  if (cnyExchangeRate.isFallback) {
    return copy.cnyUnavailable;
  }

  const suffixParts = [
    syncedDate ? copy.synced(syncedDate) : null,
    basisDate ? copy.rateBasis(basisDate) : null,
  ];
  const suffix = suffixParts.filter(Boolean).join(" · ");

  if (cnyExchangeRate.isStale) {
    const prefix = copy.cnyStale;

    return suffix ? `${prefix} · ${suffix}` : prefix;
  }

  const prefix = copy.cnyRate(cnyRate);

  return suffix ? `${prefix} · ${suffix}` : prefix;
}

function formatCnyFromUsd(value: number, exchangeRate: number) {
  return `¥${Math.round(value * exchangeRate).toLocaleString("zh-CN")}`;
}

function formatDisplayPrice(
  value: number,
  currency: DisplayCurrency,
  exchangeRate: number,
) {
  return currency === "cny"
    ? formatCnyFromUsd(value, exchangeRate)
    : formatUsd(value);
}

function formatMonthlyPrice(
  value: number,
  currency: DisplayCurrency,
  exchangeRate: number,
  locale: SiteLocale,
) {
  const copy = getPublicPricingCopy(locale).pricing;
  return currency === "cny"
    ? `${formatCnyFromUsd(value, exchangeRate)}${copy.monthlySuffix}`
    : `${formatUsd(value)}/mo`;
}

function EmptyPriceState({
  platformLabel,
  locale,
}: {
  platformLabel: string;
  locale: SiteLocale;
}) {
  const copy = getPublicPricingCopy(locale).pricing;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-sm font-semibold text-zinc-950 dark:text-white">
        {copy.noPrices(platformLabel)}
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {copy.noPricesDescription}
      </p>
    </section>
  );
}

function CurrencySelect({
  value,
  onChange,
  cnyDisabled = false,
  locale,
}: {
  value: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
  cnyDisabled?: boolean;
  locale: SiteLocale;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const activeItem =
    currencyOptions.find((item) => item.value === value) || currencyOptions[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-[148px] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-[13px] font-semibold shadow-sm outline-none transition-all duration-200 ease-out",
          open
            ? "border-lime-300 bg-white text-zinc-950 ring-4 ring-lime-500/10 dark:border-lime-500/40 dark:bg-zinc-900 dark:text-white"
            : "border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
        ].join(" ")}
        aria-label={getPublicPricingCopy(locale).pricing.displayCurrency}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="truncate">{getCurrencyLabel(activeItem.value, locale)}</span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ease-out",
            open ? "rotate-180" : "",
          ].join(" ")}
          strokeWidth={2.2}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-11 z-[70] w-full overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30"
          role="menu"
        >
          {currencyOptions.map((item) => {
            const disabled = item.value === "cny" && cnyDisabled;
            const active = item.value === value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onChange(item.value);
                    setOpen(false);
                  }
                }}
                className={[
                  "flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors duration-200 ease-out",
                  active
                    ? "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  disabled ? "cursor-not-allowed opacity-40" : "",
                ].join(" ")}
                role="menuitemradio"
                aria-checked={active}
              >
                <span>{getCurrencyLabel(item.value, locale)}</span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-lime-500" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PricingLead({
  productName,
  plan,
  platformLabel,
  displayCurrency,
  cnyExchangeRate,
  onCurrencyChange,
  locale,
}: {
  productName: string;
  plan: ProductPlan;
  platformLabel: string;
  displayCurrency: DisplayCurrency;
  cnyExchangeRate: CurrencyExchangeRate;
  onCurrencyChange: (currency: DisplayCurrency) => void;
  locale: SiteLocale;
}) {
  const stats = getPlanStats(plan);
  const referenceRegion = getReferenceRegion(plan);
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency, locale);
  const cnyRate = cnyExchangeRate.rate || UNAVAILABLE_CNY_PER_USD;
  const cnyDisabled = Boolean(cnyExchangeRate.isFallback || cnyExchangeRate.isStale);
  const cnyRateNote = getCnyRateNote(cnyExchangeRate, cnyRate, locale);
  const planDisplayName = getPlanDisplayName(productName, plan.name);
  const copy = getPublicPricingCopy(locale).pricing;

  return (
    <PublicSection>
      <div className="p-5 md:p-6">
        <div className="mb-3 inline-flex rounded-md bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 ring-1 ring-lime-200 dark:bg-lime-950/30 dark:text-lime-300 dark:ring-lime-900">
          {copy.appStoreSource}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[24px] font-semibold leading-tight text-zinc-950 md:whitespace-nowrap md:text-[28px] dark:text-white">
              {copy.conclusionTitle(planDisplayName)}
            </h2>
            <p className="mt-2 max-w-4xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.conclusionLead(platformLabel, stats.minRegion.country)}{" "}
              <strong className="font-semibold text-lime-700 dark:text-lime-300">
                {formatMonthlyPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate, locale)}
              </strong>
              {copy.conclusionMiddle(stats.maxRegion.country)}{" "}
              <strong className="font-semibold text-rose-600 dark:text-rose-300">
                {formatMonthlyPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate, locale)}
              </strong>
              {copy.conclusionSpread(stats.spreadPercent)}
            </p>
          </div>

          <div className="text-xs text-zinc-400 lg:text-right">
            {plan.freshness?.pageUpdatedAt
              ? copy.pageUpdated(plan.freshness.pageUpdatedAt)
              : copy.regionCount(plan.regions.length)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              {copy.displayCurrency}
            </span>
            <CurrencySelect
              value={displayCurrency}
              onChange={onCurrencyChange}
              cnyDisabled={cnyDisabled}
              locale={locale}
            />
          </div>

          <div className="text-xs leading-5 text-zinc-400 md:text-right">
            {displayCurrency === "cny"
              ? cnyRateNote
              : displayCurrencyLabel}
          </div>
        </div>
      </div>

      <MetricStrip>
        <MetricItem
          label={copy.lowest}
          value={`${stats.minRegion.country} · ${formatDisplayPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.minRegion.localPrice}
          tone="green"
        />
        <MetricItem
          label={copy.highest}
          value={`${stats.maxRegion.country} · ${formatDisplayPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.maxRegion.localPrice}
          tone="red"
        />
        <MetricItem
          label={copy.usBase}
          value={`${referenceRegion.country} · ${formatDisplayPrice(referenceRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={referenceRegion.code}
        />
        <MetricItem
          label={copy.regions}
          value={copy.regionCount(plan.regions.length)}
          helper={platformLabel}
        />
      </MetricStrip>

      <div className="grid border-t border-zinc-100 text-xs dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [copy.source, plan.freshness?.sourceLabel || "App Store"],
          [copy.latestCollection, plan.freshness?.priceCollectedAt],
          [copy.fxBasis, plan.freshness?.fxRateDate],
          [copy.planReview, plan.freshness?.planReviewedAt],
          [
            copy.trustStatus,
            plan.freshness?.trustStatus === "verified"
              ? copy.verified
              : plan.freshness?.trustStatus === "reviewed"
                ? copy.reviewed
                : copy.needsReview,
          ],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-zinc-100 px-5 py-3 last:border-b-0 sm:border-r lg:border-b-0 dark:border-zinc-800">
            <div className="font-medium text-zinc-400">{label}</div>
            <div className="mt-1 font-semibold text-zinc-700 dark:text-zinc-200">{value || copy.unavailable}</div>
          </div>
        ))}
      </div>
    </PublicSection>
  );
}

function RankingList({
  title,
  regions,
  referenceRegion,
  tone,
}: {
  title: string;
  regions: RegionPrice[];
  referenceRegion: RegionPrice;
  tone: "green" | "red";
}) {
  return (
    <div className="min-w-0">
      <div
        className={[
          "mb-2 text-sm font-semibold",
          tone === "green"
            ? "text-lime-700 dark:text-lime-300"
            : "text-rose-600 dark:text-rose-300",
        ].join(" ")}
      >
        {title}
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {regions.map((region, index) => {
          const diff = getDiffPercent(region.priceUsd, referenceRegion.priceUsd);

          return (
            <div
              key={`${title}-${region.code}-${region.billingPlatform || "unknown"}`}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-3 py-3 text-sm"
            >
              <div className="text-xs tabular-nums text-zinc-400">#{index + 1}</div>
              <div className="min-w-0">
                <div className="truncate font-medium text-zinc-950 dark:text-white">
                  {region.country}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">{region.code}</div>
              </div>
              <div className="font-semibold tabular-nums text-zinc-950 dark:text-white">
                {formatUsd(region.priceUsd)}
              </div>
              <div
                className={[
                  "min-w-12 text-right text-xs font-semibold tabular-nums",
                  tone === "green"
                    ? "text-lime-700 dark:text-lime-300"
                    : "text-rose-600 dark:text-rose-300",
                ].join(" ")}
              >
                {getSignedPercent(diff)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceDistribution({
  productName,
  plan,
  shareAction,
  locale,
}: {
  productName: string;
  plan: ProductPlan;
  shareAction?: ReactNode;
  locale: SiteLocale;
}) {
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const cheapRegions = sortedRegions.slice(0, 5);
  const expensiveRegions = sortedRegions.slice(-5).reverse();
  const copy = getPublicPricingCopy(locale).pricing;

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow={copy.distributionEyebrow}
        title={copy.distributionTitle}
        description={copy.distributionDescription(productName)}
        actions={shareAction}
      />

      <div className="p-4 md:p-5">
        <PriceWorldMap plan={plan} locale={locale} compact />
      </div>

      <div className="grid gap-6 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800 lg:grid-cols-2">
        <RankingList
          title={copy.lowerRegions}
          regions={cheapRegions}
          referenceRegion={referenceRegion}
          tone="green"
        />
        <RankingList
          title={copy.higherRegions}
          regions={expensiveRegions}
          referenceRegion={referenceRegion}
          tone="red"
        />
      </div>
    </PublicSection>
  );
}

export default function PricingPlatformView({
  productName,
  plan,
  cnyExchangeRate,
  shareAction,
  locale = "zh",
}: PricingPlatformViewProps) {
  const [platform] = useState<PlatformFilter>("ios");
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("usd");
  const effectiveCnyExchangeRate = cnyExchangeRate || {
    rate: UNAVAILABLE_CNY_PER_USD,
    isFallback: true,
  };
  const cnyRate = effectiveCnyExchangeRate.rate || UNAVAILABLE_CNY_PER_USD;
  const handleCurrencyChange = (currency: DisplayCurrency) => {
    if (
      currency === "cny" &&
      (effectiveCnyExchangeRate.isFallback || effectiveCnyExchangeRate.isStale)
    ) {
      setDisplayCurrency("usd");
      return;
    }

    setDisplayCurrency(currency);
  };

  const filteredPlan = useMemo<ProductPlan>(() => {
    if (platform === "all") return plan;

    return {
      ...plan,
      regions: plan.regions.filter((region) => getPlatform(region) === platform),
    };
  }, [plan, platform]);

  const platformLabel = getPlatformLabel(platform, locale);
  return (
    <div className="space-y-5">
      {filteredPlan.regions.length === 0 ? (
        <>
          <PricingLead
            productName={productName}
            plan={plan}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            cnyExchangeRate={effectiveCnyExchangeRate}
            onCurrencyChange={handleCurrencyChange}
            locale={locale}
          />
          <EmptyPriceState platformLabel={platformLabel} locale={locale} />
        </>
      ) : (
        <>
          <PricingLead
            productName={productName}
            plan={filteredPlan}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            cnyExchangeRate={effectiveCnyExchangeRate}
            onCurrencyChange={handleCurrencyChange}
            locale={locale}
          />
          <PriceDistribution
            productName={productName}
            plan={filteredPlan}
            shareAction={shareAction}
            locale={locale}
          />
          <ExpandableRegionPriceTable
            plan={filteredPlan}
            initialVisibleCount={8}
            locale={locale}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            displayCurrencyLabel={getCurrencyLabel(displayCurrency, locale)}
            formatDisplayPrice={(value) =>
              formatDisplayPrice(value, displayCurrency, cnyRate)
            }
            showPlatformFilter={false}
            showSourceColumn={platform === "all"}
          />
        </>
      )}
    </div>
  );
}

