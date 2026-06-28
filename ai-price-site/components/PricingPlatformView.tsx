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
  isFallback?: boolean;
};

type PricingPlatformViewProps = {
  productName: string;
  plan: ProductPlan;
  updatedAt?: string;
  cnyExchangeRate?: CurrencyExchangeRate;
  shareAction?: ReactNode;
};

const platformOptions: Array<{ value: PlatformFilter; label: string }> = [
  { value: "ios", label: "App Store" },
  { value: "web", label: "Web" },
  { value: "android", label: "Google Play" },
  { value: "all", label: "全部来源" },
];

const currencyOptions: Array<{ value: DisplayCurrency; label: string }> = [
  { value: "usd", label: "美元 USD" },
  { value: "cny", label: "人民币 CNY" },
];

const FALLBACK_CNY_PER_USD = 7.25;

function getPlatform(region: RegionPrice) {
  const platform = (region.billingPlatform || "unknown").toLowerCase();
  return platform === "google_play" ? "android" : platform;
}

function getDefaultPlatform(regions: RegionPrice[]): PlatformFilter {
  const platforms = new Set(regions.map(getPlatform));

  if (platforms.has("ios")) return "ios";
  if (platforms.has("web")) return "web";
  if (platforms.has("android")) return "android";

  return "all";
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

function getPlatformLabel(platform: PlatformFilter) {
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

function SourceTabs({
  value,
  items,
  onChange,
}: {
  value: PlatformFilter;
  items: Array<{
    label: string;
    count: number;
    value: PlatformFilter;
    disabled?: boolean;
  }>;
  onChange: (platform: PlatformFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeItem = items.find((item) => item.value === value) || items[0];

  const handleChange = (nextValue: PlatformFilter) => {
    setOpen(false);
    onChange(nextValue);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full md:w-[164px]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-2.5 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{activeItem.label}</span>
        <span className="ml-2 mr-1.5 shrink-0 text-[11px] font-medium text-zinc-400">
          {activeItem.count} 个地区
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          strokeWidth={2.2}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-10 z-20 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900"
          role="listbox"
        >
          {items.map((item) => {
            const active = item.value === value;

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={active}
                disabled={item.disabled}
                onClick={() => handleChange(item.value)}
                className={[
                  "relative flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-[13px] transition-colors before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full",
                  active
                    ? "bg-zinc-50 font-semibold text-zinc-950 before:bg-lime-500 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 before:bg-transparent hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  item.disabled ? "cursor-not-allowed opacity-45" : "",
                ].join(" ")}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                  {item.count} 个地区
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeItem =
    currencyOptions.find((item) => item.value === value) || currencyOptions[0];

  const handleChange = (nextValue: DisplayCurrency) => {
    setOpen(false);
    onChange(nextValue);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full md:w-[132px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-2.5 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{activeItem.label}</span>
        <ChevronDown
          className={[
            "ml-2 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          strokeWidth={2.2}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-10 z-20 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900"
          role="listbox"
        >
          {currencyOptions.map((item) => {
            const active = item.value === value;

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleChange(item.value)}
                className={[
                  "relative flex min-h-8 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full",
                  active
                    ? "bg-zinc-50 font-semibold text-zinc-950 before:bg-lime-500 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 before:bg-transparent hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                ].join(" ")}
              >
                {item.label}
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
  platform,
  platformLabel,
  displayCurrency,
  cnyExchangeRate,
  updatedAt,
  sourceItems,
  onPlatformChange,
  onCurrencyChange,
}: {
  productName: string;
  plan: ProductPlan;
  platform: PlatformFilter;
  platformLabel: string;
  displayCurrency: DisplayCurrency;
  cnyExchangeRate: CurrencyExchangeRate;
  updatedAt?: string;
  sourceItems: Array<{
    label: string;
    count: number;
    value: PlatformFilter;
    disabled?: boolean;
  }>;
  onPlatformChange: (platform: PlatformFilter) => void;
  onCurrencyChange: (currency: DisplayCurrency) => void;
}) {
  const stats = getPlanStats(plan);
  const referenceRegion = getReferenceRegion(plan);
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency);
  const cnyRate = cnyExchangeRate.rate || FALLBACK_CNY_PER_USD;
  const cnyRateNote = cnyExchangeRate.isFallback
    ? `人民币按 ${cnyRate.toFixed(2)} 兜底汇率估算`
    : `人民币按 ${cnyRate.toFixed(4)} 汇率估算${
        cnyExchangeRate.rateDate ? ` · ${cnyExchangeRate.rateDate}` : ""
      }`;

  return (
    <PublicSection>
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
          <h2 className="text-[24px] font-semibold leading-tight text-zinc-950 md:whitespace-nowrap md:text-[28px] dark:text-white">
            {productName} {plan.name} 全球价格结论
          </h2>
          <p className="mt-2 max-w-4xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
            当前 {platformLabel} 数据下，{stats.minRegion.country} 最便宜，约{" "}
            <strong className="font-semibold text-lime-700 dark:text-lime-300">
              {formatMonthlyPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}
            </strong>
            ；{stats.maxRegion.country} 最贵，约{" "}
            <strong className="font-semibold text-rose-600 dark:text-rose-300">
              {formatMonthlyPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}
            </strong>
            ，价差约 {stats.spreadPercent}%。
          </p>
          </div>

          <div className="text-xs text-zinc-400 lg:text-right">
            {updatedAt ? `更新：${updatedAt}` : `${plan.regions.length} 个地区`}
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 md:grid-cols-[auto_auto_1fr] md:items-center">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              显示币种
            </span>
            <CurrencySelect
              value={displayCurrency}
              onChange={onCurrencyChange}
            />
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              数据来源
            </span>
            <SourceTabs
              value={platform}
              items={sourceItems}
              onChange={onPlatformChange}
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
          label="最低价"
          value={`${stats.minRegion.country} · ${formatDisplayPrice(stats.minRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.minRegion.localPrice}
          tone="green"
        />
        <MetricItem
          label="最高价"
          value={`${stats.maxRegion.country} · ${formatDisplayPrice(stats.maxRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={stats.maxRegion.localPrice}
          tone="red"
        />
        <MetricItem
          label="美国基准"
          value={`${referenceRegion.country} · ${formatDisplayPrice(referenceRegion.priceUsd, displayCurrency, cnyRate)}`}
          helper={referenceRegion.code}
        />
        <MetricItem
          label="覆盖地区"
          value={`${plan.regions.length} 个`}
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
}: {
  productName: string;
  plan: ProductPlan;
  shareAction?: ReactNode;
}) {
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const cheapRegions = sortedRegions.slice(0, 5);
  const expensiveRegions = sortedRegions.slice(-5).reverse();

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow="Price distribution"
        title="全球价格分布与地区排行"
        description={
          <>
            地图是这一页的主视觉，用来快速理解 {productName} 的全球价格差异；榜单只做辅助定位。
          </>
        }
        actions={shareAction}
      />

      <div className="p-4 md:p-5">
        <PriceWorldMap plan={plan} locale="zh" compact />
      </div>

      <div className="grid gap-6 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800 lg:grid-cols-2">
        <RankingList
          title="更便宜的地区"
          regions={cheapRegions}
          referenceRegion={referenceRegion}
          tone="green"
        />
        <RankingList
          title="更贵的地区"
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
}: PricingPlatformViewProps) {
  const [platform, setPlatform] = useState<PlatformFilter>(() =>
    getDefaultPlatform(plan.regions),
  );
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("usd");
  const effectiveCnyExchangeRate = cnyExchangeRate || {
    rate: FALLBACK_CNY_PER_USD,
    isFallback: true,
  };
  const cnyRate = effectiveCnyExchangeRate.rate || FALLBACK_CNY_PER_USD;

  const platformCounts = useMemo(() => {
    return plan.regions.reduce<Record<string, number>>((counts, region) => {
      const key = getPlatform(region);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [plan.regions]);

  const filteredPlan = useMemo<ProductPlan>(() => {
    if (platform === "all") return plan;

    return {
      ...plan,
      regions: plan.regions.filter((region) => getPlatform(region) === platform),
    };
  }, [plan, platform]);

  const platformLabel = getPlatformLabel(platform);
  const sourceItems = platformOptions.map((option) => {
    const count =
      option.value === "all"
        ? plan.regions.length
        : platformCounts[option.value] || 0;

    return {
      label: option.label,
      count,
      value: option.value,
      disabled: option.value !== "all" && count === 0,
    };
  });

  return (
    <div className="space-y-5">
      {filteredPlan.regions.length === 0 ? (
        <>
          <PricingLead
            productName={productName}
            plan={plan}
            platform={platform}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            cnyExchangeRate={effectiveCnyExchangeRate}
            updatedAt={updatedAt}
            sourceItems={sourceItems}
            onPlatformChange={setPlatform}
            onCurrencyChange={setDisplayCurrency}
          />
          <EmptyPriceState platformLabel={platformLabel} />
        </>
      ) : (
        <>
          <PricingLead
            productName={productName}
            plan={filteredPlan}
            platform={platform}
            platformLabel={platformLabel}
            displayCurrency={displayCurrency}
            cnyExchangeRate={effectiveCnyExchangeRate}
            updatedAt={updatedAt}
            sourceItems={sourceItems}
            onPlatformChange={setPlatform}
            onCurrencyChange={setDisplayCurrency}
          />
          <PriceDistribution
            productName={productName}
            plan={filteredPlan}
            shareAction={shareAction}
          />
          <ExpandableRegionPriceTable
            plan={filteredPlan}
            initialVisibleCount={8}
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
