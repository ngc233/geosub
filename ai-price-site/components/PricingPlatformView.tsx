"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Map } from "lucide-react";
import {
  formatUsd,
  getPlanStats,
  type ProductPlan,
  type RegionPrice,
} from "../lib/public-pricing-model";
import ExpandableRegionPriceTable from "./ExpandableRegionPriceTable";
import {
  MetricItem,
  PublicSection,
  PublicSectionHeader,
} from "./ui/PublicPage";
import { getPlanDisplayName } from "../lib/pricing-labels";
import { getPricingPlatformCopy } from "../lib/pricing-platform-copy";
import {
  getSiteLocaleDefinition,
  type SiteLocale,
} from "../lib/site-locale";
import {
  getDisplayCurrencyFractionDigits,
  getDisplayCurrencySymbolOverride,
  supportedDisplayCurrencies,
  type DisplayCurrency,
} from "../lib/display-currency";
import SharePriceModal, {
  type SharePriceProduct,
} from "./SharePriceModal";

function MapLoadingPlaceholder() {
  return (
    <div
      className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(161,161,170,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(161,161,170,0.12)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute left-[14%] top-[30%] h-20 w-32 animate-pulse rounded-[48%] bg-zinc-200/80 dark:bg-zinc-800" />
      <div className="absolute left-[43%] top-[23%] h-28 w-44 animate-pulse rounded-[45%] bg-zinc-200/80 dark:bg-zinc-800" />
      <div className="absolute right-[13%] top-[45%] h-20 w-36 animate-pulse rounded-[48%] bg-zinc-200/80 dark:bg-zinc-800" />
      <Map className="relative text-zinc-400 dark:text-zinc-500" size={28} />
    </div>
  );
}

const PriceWorldMap = dynamic(() => import("./PriceWorldMap"), {
  ssr: false,
  loading: MapLoadingPlaceholder,
});

function DeferredPriceWorldMap({
  plan,
  locale,
  formatPrice,
}: {
  plan: ProductPlan;
  locale: SiteLocale;
  formatPrice: (value: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldRender) return;

    if (typeof window.IntersectionObserver !== "function") {
      const unsupportedBrowserTimer = window.setTimeout(
        () => setShouldRender(true),
        0,
      );
      return () => window.clearTimeout(unsupportedBrowserTimer);
    }

    const fallbackTimer = window.setTimeout(() => setShouldRender(true), 1_500);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        window.clearTimeout(fallbackTimer);
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(container);
    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [shouldRender]);

  return (
    <div ref={containerRef}>
      {shouldRender ? (
        <PriceWorldMap
          plan={plan}
          locale={locale}
          compact
          formatPrice={formatPrice}
        />
      ) : (
        <MapLoadingPlaceholder />
      )}
    </div>
  );
}

type PlatformFilter = "ios" | "web" | "android" | "all";

type CurrencyExchangeRate = {
  rate: number;
  source?: string | null;
  rateDate?: string | null;
  fetchedAt?: string | null;
  isFallback?: boolean;
  isStale?: boolean;
  isExpired?: boolean;
};

type PricingPlatformViewProps = {
  productName: string;
  shareProduct: SharePriceProduct;
  plan: ProductPlan;
  defaultCurrency: DisplayCurrency;
  exchangeRates: Partial<Record<DisplayCurrency, CurrencyExchangeRate>>;
  locale?: SiteLocale;
};

const UNAVAILABLE_EXCHANGE_RATE = 0;

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
  const copy = getPricingPlatformCopy(locale);
  if (platform === "ios") return "App Store";
  if (platform === "web") return copy.officialWebPricing;
  if (platform === "android") return "Google Play";
  if (platform === "all") return copy.allDiagnosticSources;
  return copy.allSources;
}

function getCurrencyName(
  currency: DisplayCurrency,
  locale: SiteLocale = "zh",
) {
  const definition = getSiteLocaleDefinition(locale);

  try {
    const displayName = new Intl.DisplayNames([definition.intlLocale], {
      type: "currency",
    }).of(currency);

    if (displayName) {
      const normalizedName = displayName
        .replace(currency, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      return normalizedName || displayName;
    }
  } catch {
    // Currency codes remain a stable fallback in older runtimes.
  }

  return currency;
}

function getCurrencyLabel(
  currency: DisplayCurrency,
  locale: SiteLocale = "zh",
) {
  return `${getCurrencyName(currency, locale)} ${currency}`;
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

function getExchangeRateNote(
  exchangeRate: CurrencyExchangeRate,
  rate: number,
  currency: DisplayCurrency,
  locale: SiteLocale,
) {
  const copy = getPricingPlatformCopy(locale);
  const syncedDate = formatSyncDate(exchangeRate.fetchedAt, locale);
  const basisDate = exchangeRate.rateDate || null;

  const suffixParts = [
    syncedDate ? copy.synced(syncedDate) : null,
    basisDate ? copy.rateBasis(basisDate) : null,
  ];
  const suffix = suffixParts.filter(Boolean).join(" · ");
  const prefix = `1 USD = ${rate.toLocaleString(
    getSiteLocaleDefinition(locale).intlLocale,
    { maximumFractionDigits: 4 },
  )} ${currency}`;

  const staleWarning = exchangeRate.isStale
    ? getStaleRateWarning(locale)
    : null;
  return [prefix, suffix, staleWarning].filter(Boolean).join(" · ");
}

function getStaleRateWarning(locale: SiteLocale) {
  const warnings: Record<SiteLocale, string> = {
    zh: "当前使用最近一次可用汇率，可能与实时汇率有偏差",
    "zh-tw": "目前使用最近一次可用匯率，可能與即時匯率有偏差",
    en: "Using the latest available rate; the live rate may differ",
    ja: "直近の利用可能なレートを使用中です。現在のレートとは異なる場合があります",
    ko: "최근 사용 가능한 환율을 적용 중이며 실시간 환율과 다를 수 있습니다",
    es: "Se usa el último tipo disponible; el tipo actual puede variar",
    tr: "Son kullanılabilir kur kullanılıyor; güncel kur farklı olabilir",
    ar: "يُستخدم أحدث سعر متاح وقد يختلف عن السعر الحالي",
    fr: "Dernier taux disponible utilisé ; le taux actuel peut différer",
    it: "È usato l'ultimo tasso disponibile; il tasso attuale può variare",
    de: "Der zuletzt verfügbare Kurs wird verwendet; der aktuelle Kurs kann abweichen",
    pt: "Está sendo usada a última taxa disponível; a taxa atual pode variar",
  };

  return warnings[locale];
}

function formatDisplayPrice(
  value: number,
  currency: DisplayCurrency,
  exchangeRate: number,
  locale: SiteLocale,
) {
  if (currency === "USD") {
    return formatUsd(value);
  }

  const symbolOverride = getDisplayCurrencySymbolOverride(currency);
  if (symbolOverride) {
    const formattedValue = new Intl.NumberFormat(
      getSiteLocaleDefinition(locale).intlLocale,
      {
        maximumFractionDigits:
          getDisplayCurrencyFractionDigits(currency),
      },
    ).format(value * exchangeRate);

    return `${symbolOverride}${formattedValue}`;
  }

  return new Intl.NumberFormat(getSiteLocaleDefinition(locale).intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: getDisplayCurrencyFractionDigits(currency),
  }).format(value * exchangeRate);
}

function formatMonthlyPrice(
  value: number,
  currency: DisplayCurrency,
  exchangeRate: number,
  locale: SiteLocale,
) {
  const copy = getPricingPlatformCopy(locale);
  return `${formatDisplayPrice(
    value,
    currency,
    exchangeRate,
    locale,
  )}${copy.monthlySuffix}`;
}

function EmptyPriceState({
  platformLabel,
  locale,
}: {
  platformLabel: string;
  locale: SiteLocale;
}) {
  const copy = getPricingPlatformCopy(locale);

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
  options,
  disabledCurrencies,
  locale,
  compact = false,
}: {
  value: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
  options: DisplayCurrency[];
  disabledCurrencies: DisplayCurrency[];
  locale: SiteLocale;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const activeItem =
    options.find((item) => item === value) || options[0];

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
    <div
      ref={containerRef}
      className={[
        "relative shrink-0",
        compact ? "w-[138px] sm:w-[168px]" : "w-[184px]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-[13px] font-semibold shadow-sm outline-none transition-all duration-200 ease-out",
          open
            ? "border-lime-300 bg-white text-zinc-950 ring-4 ring-lime-500/10 dark:border-lime-500/40 dark:bg-zinc-900 dark:text-white"
            : "border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
        ].join(" ")}
        aria-label={getPricingPlatformCopy(locale).displayCurrency}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {getCurrencyName(activeItem, locale)}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-zinc-400">
            {activeItem}
          </span>
        </span>
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
          className="absolute start-0 top-11 z-[70] max-h-[360px] w-[500px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30"
          role="menu"
        >
          <div className="grid grid-cols-1 gap-0.5 min-[420px]:grid-cols-2">
            {options.map((item) => {
              const disabled = disabledCurrencies.includes(item);
              const active = item === value;

              return (
                <button
                  key={item}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onChange(item);
                      setOpen(false);
                    }
                  }}
                  className={[
                    "grid h-10 w-full grid-cols-[42px_minmax(0,1fr)_8px] items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors duration-200 ease-out",
                    active
                      ? "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                    disabled ? "cursor-not-allowed opacity-40" : "",
                  ].join(" ")}
                  role="menuitemradio"
                  aria-checked={active}
                >
                  <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                    {item}
                  </span>
                  <span className="truncate whitespace-nowrap">
                    {getCurrencyName(item, locale)}
                  </span>
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      active ? "bg-lime-500" : "bg-transparent",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </div>
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
  exchangeRates,
  onCurrencyChange,
  locale,
}: {
  productName: string;
  plan: ProductPlan;
  platformLabel: string;
  displayCurrency: DisplayCurrency;
  exchangeRates: Partial<Record<DisplayCurrency, CurrencyExchangeRate>>;
  onCurrencyChange: (currency: DisplayCurrency) => void;
  locale: SiteLocale;
}) {
  const stats = getPlanStats(plan);
  const referenceRegion = getReferenceRegion(plan);
  const hasUsReference = referenceRegion.code.toUpperCase() === "US";
  const selectedExchangeRate = exchangeRates[displayCurrency] || {
    rate: UNAVAILABLE_EXCHANGE_RATE,
    isFallback: true,
    isStale: true,
  };
  const selectedRate =
    selectedExchangeRate.rate || UNAVAILABLE_EXCHANGE_RATE;
  const exchangeRateNote = getExchangeRateNote(
    selectedExchangeRate,
    selectedRate,
    displayCurrency,
    locale,
  );
  const disabledCurrencies = supportedDisplayCurrencies.filter((currency) => {
    const exchangeRate = exchangeRates[currency];
    return Boolean(
      !exchangeRate || exchangeRate.isFallback || exchangeRate.isExpired,
    );
  });
  const planDisplayName = getPlanDisplayName(productName, plan.name);
  const copy = getPricingPlatformCopy(locale);

  return (
    <PublicSection>
      <div className="p-5 md:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {platformLabel}
          </span>
          <span className="whitespace-nowrap text-xs text-zinc-400">
            {plan.freshness?.pageUpdatedAt
              ? copy.pageUpdated(plan.freshness.pageUpdatedAt)
              : copy.regionCount(plan.regions.length)}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-zinc-950 md:text-[26px] dark:text-white">
            {copy.conclusionTitle(planDisplayName)}
          </h2>
          <p className="mt-2 max-w-4xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
            {copy.conclusionLead(platformLabel, stats.minRegion.country)}{" "}
            <strong className="font-semibold text-[#4f7f2a] dark:text-[#bef264]">
              {formatMonthlyPrice(stats.minRegion.priceUsd, displayCurrency, selectedRate, locale)}
            </strong>
            {copy.conclusionMiddle(stats.maxRegion.country)}{" "}
            <strong className="font-semibold text-[#a24b3a] dark:text-[#f0a08f]">
              {formatMonthlyPrice(stats.maxRegion.priceUsd, displayCurrency, selectedRate, locale)}
            </strong>
            {copy.conclusionSpread(stats.spreadPercent)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              {copy.displayCurrency}
            </span>
            <CurrencySelect
              value={displayCurrency}
              onChange={onCurrencyChange}
              options={[...supportedDisplayCurrencies]}
              disabledCurrencies={disabledCurrencies}
              locale={locale}
              compact
            />
          </div>

          {displayCurrency !== "USD" ? (
            <div
              className={[
                "text-xs leading-5",
                selectedExchangeRate.isStale
                  ? "font-medium text-amber-700 dark:text-amber-300"
                  : "text-zinc-400",
              ].join(" ")}
            >
              {exchangeRateNote}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800 md:px-6 lg:grid-cols-4">
        {[
          <MetricItem
            key="lowest"
            label={copy.lowest}
            value={`${stats.minRegion.country} · ${formatDisplayPrice(stats.minRegion.priceUsd, displayCurrency, selectedRate, locale)}`}
            helper={stats.minRegion.localPrice}
            tone="saving"
          />,
          <MetricItem
            key="highest"
            label={copy.highest}
            value={`${stats.maxRegion.country} · ${formatDisplayPrice(stats.maxRegion.priceUsd, displayCurrency, selectedRate, locale)}`}
            helper={stats.maxRegion.localPrice}
            tone="premium"
          />,
          <MetricItem
            key="base"
            label={hasUsReference ? copy.usBase : referenceRegion.country}
            value={`${referenceRegion.country} · ${formatDisplayPrice(referenceRegion.priceUsd, displayCurrency, selectedRate, locale)}`}
            helper={referenceRegion.code}
          />,
          <MetricItem
            key="regions"
            label={copy.regions}
            value={copy.regionCount(plan.regions.length)}
          />,
        ].map((metric) => (
          <div
            key={metric.key}
            className="rounded-lg bg-zinc-50 px-4 dark:bg-zinc-900"
          >
            {metric}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-zinc-100 px-5 py-4 text-xs dark:border-zinc-800 sm:grid-cols-3 md:px-6 lg:grid-cols-5">
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
          <div key={label} className="min-w-0">
            <div className="font-medium text-zinc-400">{label}</div>
            <div className="mt-1 truncate font-semibold text-zinc-700 dark:text-zinc-200" title={value || copy.unavailable}>
              {value || copy.unavailable}
            </div>
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
  formatPrice,
}: {
  title: string;
  regions: RegionPrice[];
  referenceRegion: RegionPrice;
  tone: "saving" | "premium";
  formatPrice: (value: number) => string;
}) {
  return (
    <div className="min-w-0">
      <div
        className={[
          "mb-2 text-sm font-semibold",
          tone === "saving"
            ? "text-[#4f7f2a] dark:text-[#bef264]"
            : "text-[#a24b3a] dark:text-[#f0a08f]",
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
                {formatPrice(region.priceUsd)}
              </div>
              <div
                className={[
                  "min-w-12 text-right text-xs font-semibold tabular-nums",
                  tone === "saving"
                    ? "text-[#4f7f2a] dark:text-[#bef264]"
                    : "text-[#a24b3a] dark:text-[#f0a08f]",
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
  shareProduct,
  plan,
  locale,
  formatPrice,
}: {
  productName: string;
  shareProduct: SharePriceProduct;
  plan: ProductPlan;
  locale: SiteLocale;
  formatPrice: (value: number) => string;
}) {
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const cheapRegions = sortedRegions.slice(0, 5);
  const expensiveRegions = sortedRegions.slice(-5).reverse();
  const copy = getPricingPlatformCopy(locale);

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow={copy.distributionEyebrow}
        title={copy.distributionTitle}
        description={copy.distributionDescription(productName)}
        actions={
          <SharePriceModal
            product={shareProduct}
            plan={plan}
            stats={getPlanStats(plan)}
            locale={locale}
          />
        }
      />

      <div className="p-4 md:p-5">
        <DeferredPriceWorldMap
          plan={plan}
          locale={locale}
          formatPrice={formatPrice}
        />
      </div>

      <div className="grid gap-6 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800 lg:grid-cols-2">
        <RankingList
          title={copy.lowerRegions}
          regions={cheapRegions}
          referenceRegion={referenceRegion}
          tone="saving"
          formatPrice={formatPrice}
        />
        <RankingList
          title={copy.higherRegions}
          regions={expensiveRegions}
          referenceRegion={referenceRegion}
          tone="premium"
          formatPrice={formatPrice}
        />
      </div>
    </PublicSection>
  );
}

export default function PricingPlatformView({
  productName,
  shareProduct,
  plan,
  defaultCurrency,
  exchangeRates,
  locale = "zh",
}: PricingPlatformViewProps) {
  const platform = useMemo<PlatformFilter>(() => {
    const availablePlatforms = new Set(plan.regions.map(getPlatform));

    if (availablePlatforms.has("ios")) return "ios";
    if (availablePlatforms.has("web")) return "web";
    if (availablePlatforms.has("android")) return "android";
    return "all";
  }, [plan]);
  const [currencyPreference, setCurrencyPreference] =
    useState<DisplayCurrency>(defaultCurrency);
  const preferredExchangeRate = exchangeRates[currencyPreference];
  const displayCurrency =
    currencyPreference !== "USD" &&
    (!preferredExchangeRate ||
      preferredExchangeRate.isFallback ||
      preferredExchangeRate.isExpired)
      ? "USD"
      : currencyPreference;
  const selectedExchangeRate = exchangeRates[displayCurrency] || {
    rate: UNAVAILABLE_EXCHANGE_RATE,
    isFallback: true,
    isStale: true,
  };
  const selectedRate =
    selectedExchangeRate.rate || UNAVAILABLE_EXCHANGE_RATE;
  const disabledCurrencies = useMemo(
    () =>
      supportedDisplayCurrencies.filter((currency) => {
        const exchangeRate = exchangeRates[currency];
        return Boolean(
          !exchangeRate || exchangeRate.isFallback || exchangeRate.isExpired,
        );
      }),
    [exchangeRates],
  );

  const handleCurrencyChange = (currency: DisplayCurrency) => {
    const exchangeRate = exchangeRates[currency];
    if (
      !exchangeRate ||
      exchangeRate.isFallback ||
      exchangeRate.isExpired
    ) {
      setCurrencyPreference("USD");
      return;
    }

    setCurrencyPreference(currency);
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
            exchangeRates={exchangeRates}
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
            exchangeRates={exchangeRates}
            onCurrencyChange={handleCurrencyChange}
            locale={locale}
          />
          <PriceDistribution
            productName={productName}
            shareProduct={shareProduct}
            plan={filteredPlan}
            locale={locale}
            formatPrice={(value) =>
              formatDisplayPrice(value, displayCurrency, selectedRate, locale)
            }
          />
          <ExpandableRegionPriceTable
            plan={filteredPlan}
            initialVisibleCount={8}
            locale={locale}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            displayCurrencyLabel={getCurrencyLabel(displayCurrency, locale)}
            formatDisplayPrice={(value) =>
              formatDisplayPrice(value, displayCurrency, selectedRate, locale)
            }
            toolbarCurrencyControl={
              <CurrencySelect
                value={displayCurrency}
                onChange={handleCurrencyChange}
                options={[...supportedDisplayCurrencies]}
                disabledCurrencies={disabledCurrencies}
                locale={locale}
                compact
              />
            }
            showPlatformFilter={false}
            showSourceColumn={platform === "all"}
          />
        </>
      )}
    </div>
  );
}
