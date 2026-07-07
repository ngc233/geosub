"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatUsd,
  getPlanStats,
  type ProductPlan,
  type RegionPrice,
} from "../data/ai-pricing";
import ExpandableRegionPriceTable from "./ExpandableRegionPriceTable";
import PriceWorldMap from "./PriceWorldMap";
import {
  MetricItem,
  MetricStrip,
  PublicSection,
  PublicSectionHeader,
} from "./ui/PublicPage";

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
  updatedAt?: string;
  cnyExchangeRate?: CurrencyExchangeRate;
  shareAction?: ReactNode;
  locale?: "zh" | "en";
};

const platformOptions: Array<{ value: PlatformFilter; label: string }> = [
  { value: "ios", label: "App Store" },
  { value: "web", label: "Web 官方价" },
  { value: "android", label: "Google Play" },
  { value: "all", label: "全部来源诊断" },
];

const currencyOptions: Array<{ value: DisplayCurrency; label: string }> = [
  { value: "usd", label: "美元 USD" },
  { value: "cny", label: "人民币 CNY" },
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

function getPlatformLabel(platform: PlatformFilter, locale: "zh" | "en" = "zh") {
  if (locale === "en") {
    if (platform === "ios") return "App Store";
    if (platform === "web") return "official web pricing";
    if (platform === "android") return "Google Play";
    if (platform === "all") return "all diagnostic sources";
  }

  return (
    platformOptions.find((option) => option.value === platform)?.label ||
    "全部来源"
  );
}

function getCurrencyLabel(currency: DisplayCurrency) {
  return (
    currencyOptions.find((option) => option.value === currency)?.label ||
    "美元 USD"
  );
}

function formatSyncDate(value: string | null | undefined, locale: "zh" | "en") {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
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
  locale: "zh" | "en",
) {
  const syncedDate = formatSyncDate(cnyExchangeRate.fetchedAt, locale);
  const basisDate = cnyExchangeRate.rateDate || null;

  if (cnyExchangeRate.isFallback) {
    return locale === "en"
      ? "CNY estimate unavailable: exchange-rate sync is pending"
      : "人民币估算暂不可用：汇率待同步";
  }

  const suffixParts =
    locale === "en"
      ? [
          syncedDate ? `synced ${syncedDate}` : null,
          basisDate ? `rate basis ${basisDate}` : null,
        ]
      : [
          syncedDate ? `同步 ${syncedDate}` : null,
          basisDate ? `汇率基准 ${basisDate}` : null,
        ];
  const suffix = suffixParts.filter(Boolean).join(" · ");

  if (cnyExchangeRate.isStale) {
    const prefix =
      locale === "en"
        ? "CNY estimate paused: exchange-rate sync is stale"
        : "人民币估算暂停：汇率同步已过期";

    return suffix ? `${prefix} · ${suffix}` : prefix;
  }

  const prefix =
    locale === "en"
      ? `CNY uses ${cnyRate.toFixed(4)} USD/CNY`
      : `人民币按 ${cnyRate.toFixed(4)} 汇率估算`;

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
) {
  return currency === "cny"
    ? `${formatCnyFromUsd(value, exchangeRate)}/月`
    : `${formatUsd(value)}/mo`;
}

function EmptyPriceState({ platformLabel }: { platformLabel: string }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-sm font-semibold text-zinc-950 dark:text-white">
        暂无 {platformLabel} 价格数据
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        该来源还没有进入正式价格库。后续补齐后，这里会自动显示价格分布、地区排行和明细表。
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
  locale: "zh" | "en";
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
        aria-label={locale === "en" ? "Display currency" : "显示币种"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="truncate">{activeItem.label}</span>
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
                <span>{item.label}</span>
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
  updatedAt,
  onCurrencyChange,
  locale,
}: {
  productName: string;
  plan: ProductPlan;
  platformLabel: string;
  displayCurrency: DisplayCurrency;
  cnyExchangeRate: CurrencyExchangeRate;
  updatedAt?: string;
  onCurrencyChange: (currency: DisplayCurrency) => void;
  locale: "zh" | "en";
}) {
  const stats = getPlanStats(plan);
  const referenceRegion = getReferenceRegion(plan);
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency);
  const cnyRate = cnyExchangeRate.rate || UNAVAILABLE_CNY_PER_USD;
  const cnyDisabled = Boolean(cnyExchangeRate.isFallback || cnyExchangeRate.isStale);
  const cnyRateNote = getCnyRateNote(cnyExchangeRate, cnyRate, locale);

  return (
    <PublicSection>
      <div className="p-5 md:p-6">
        <div className="mb-3 inline-flex rounded-md bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 ring-1 ring-lime-200 dark:bg-lime-950/30 dark:text-lime-300 dark:ring-lime-900">
          {locale === "en" ? "V1 official price source: App Store" : "V1 正式价格源：App Store"}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[24px] font-semibold leading-tight text-zinc-950 md:whitespace-nowrap md:text-[28px] dark:text-white">
              {locale === "en"
                ? `${productName} ${plan.name} global price conclusion`
                : `${productName} ${plan.name} 全球价格结论`}
            </h2>
            <p className="mt-2 max-w-4xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
              {locale === "en" ? (
                <>
                  Based on official {platformLabel} pricing, {stats.minRegion.country} is currently the cheapest at about{" "}
                  <strong className="font-semibold text-lime-700 dark:text-lime-300">
                    {formatMonthlyPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}
                  </strong>
                  ; {stats.maxRegion.country} is the most expensive at about{" "}
                  <strong className="font-semibold text-rose-600 dark:text-rose-300">
                    {formatMonthlyPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}
                  </strong>
                  , with a spread of about {stats.spreadPercent}%.
                </>
              ) : (
                <>
                  当前以 {platformLabel} 正式价格比较，{stats.minRegion.country} 最便宜，约{" "}
                  <strong className="font-semibold text-lime-700 dark:text-lime-300">
                    {formatMonthlyPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}
                  </strong>
                  ；{stats.maxRegion.country} 最贵，约{" "}
                  <strong className="font-semibold text-rose-600 dark:text-rose-300">
                    {formatMonthlyPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}
                  </strong>
                  ，价差约 {stats.spreadPercent}%。
                </>
              )}
            </p>
          </div>

          <div className="text-xs text-zinc-400 lg:text-right">
            {updatedAt
              ? locale === "en" ? `Published prices updated: ${updatedAt}` : `正式价更新：${updatedAt}`
              : locale === "en" ? `${plan.regions.length} regions` : `${plan.regions.length} 个地区`}
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              {locale === "en" ? "Display currency" : "显示币种"}
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
          label={locale === "en" ? "Lowest" : "最低价"}
          value={`${stats.minRegion.country} · ${formatDisplayPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.minRegion.localPrice}
          tone="green"
        />
        <MetricItem
          label={locale === "en" ? "Highest" : "最高价"}
          value={`${stats.maxRegion.country} · ${formatDisplayPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.maxRegion.localPrice}
          tone="red"
        />
        <MetricItem
          label={locale === "en" ? "US base" : "美国基准"}
          value={`${referenceRegion.country} · ${formatDisplayPrice(referenceRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={referenceRegion.code}
        />
        <MetricItem
          label={locale === "en" ? "Regions" : "覆盖地区"}
          value={locale === "en" ? `${plan.regions.length}` : `${plan.regions.length} 个`}
          helper={platformLabel}
        />
      </MetricStrip>
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
  locale: "zh" | "en";
}) {
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const cheapRegions = sortedRegions.slice(0, 5);
  const expensiveRegions = sortedRegions.slice(-5).reverse();

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow="Price distribution"
        title={locale === "en" ? "Global price distribution and regional ranking" : "全球价格分布与地区排行"}
        description={
          locale === "en" ? (
            <>
              The map helps explain {productName} regional price differences; the lists highlight lower-price and higher-price regions.
            </>
          ) : (
            <>
              地图用于快速理解 {productName} 的全球价格差异；榜单用于辅助定位低价区和高价区。
            </>
          )
        }
        actions={shareAction}
      />

      <div className="p-4 md:p-5">
        <PriceWorldMap plan={plan} locale={locale} compact />
      </div>

      <div className="grid gap-6 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800 lg:grid-cols-2">
        <RankingList
          title={locale === "en" ? "Lower-price regions" : "更便宜的地区"}
          regions={cheapRegions}
          referenceRegion={referenceRegion}
          tone="green"
        />
        <RankingList
          title={locale === "en" ? "Higher-price regions" : "更贵的地区"}
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
  updatedAt,
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
            updatedAt={updatedAt}
            onCurrencyChange={handleCurrencyChange}
            locale={locale}
          />
          <EmptyPriceState platformLabel={platformLabel} />
        </>
      ) : (
        <>
          <PricingLead
            productName={productName}
            plan={filteredPlan}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            cnyExchangeRate={effectiveCnyExchangeRate}
            updatedAt={updatedAt}
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
            displayCurrencyLabel={getCurrencyLabel(displayCurrency)}
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

