"use client";

import { useMemo, useState } from "react";
import type { ProductPlan, RegionPrice } from "../data/ai-pricing";
import { formatUsd } from "../data/ai-pricing";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";

type PlatformFilter = "ios" | "web" | "android" | "all";

type Props = {
  plan: ProductPlan;
  initialVisibleCount?: number;
  locale?: "zh" | "en";
  platformLabel?: string;
  displayCurrency?: "usd" | "cny";
  displayCurrencyLabel?: string;
  formatDisplayPrice?: (value: number) => string;
  showPlatformFilter?: boolean;
  showSourceColumn?: boolean;
};

const platformOptions: Array<{ value: PlatformFilter; label: string }> = [
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
  { value: "android", label: "Google Play" },
  { value: "all", label: "全部" },
];

function getPlatform(region: RegionPrice) {
  const platform = (region.billingPlatform || "unknown").toLowerCase();
  return platform === "google_play" ? "android" : platform;
}

function getPlatformLabel(value: string) {
  const platform = value.toLowerCase();

  if (platform === "ios") return "iOS";
  if (platform === "web") return "Web";
  if (platform === "android" || platform === "google_play") return "Google Play";
  if (platform === "steam") return "Steam";
  if (platform === "gift_card") return "Gift Card";

  return "Unknown";
}

function getRegionPlatformLabel(region: RegionPrice) {
  return region.billingPlatformLabel || getPlatformLabel(getPlatform(region));
}

function getDefaultPlatform(regions: RegionPrice[]): PlatformFilter {
  const platforms = new Set(regions.map(getPlatform));

  if (platforms.has("ios")) return "ios";
  if (platforms.has("web")) return "web";
  if (platforms.has("android")) return "android";

  return "all";
}

function getSortedRegions(regions: RegionPrice[]) {
  return [...regions].sort((a, b) => a.priceUsd - b.priceUsd);
}

function getReferenceRegion(regions: RegionPrice[]) {
  return (
    regions.find((region) => region.code.toUpperCase() === "US") ||
    getSortedRegions(regions)[0]
  );
}

function getDiffPercent(region: RegionPrice, referencePrice: number) {
  if (referencePrice <= 0) return 0;
  return Math.round(((region.priceUsd - referencePrice) / referencePrice) * 100);
}

function getDiffText(diffPercent: number) {
  if (diffPercent === 0) return "与美国相同";
  if (diffPercent > 0) return `比美国贵 ${diffPercent}%`;
  return `比美国便宜 ${Math.abs(diffPercent)}%`;
}

function getDiffTone(diffPercent: number) {
  if (diffPercent < -5) return "text-emerald-700 dark:text-emerald-300";
  if (diffPercent > 18) return "text-rose-600 dark:text-rose-300";
  if (diffPercent > 5) return "text-amber-700 dark:text-amber-300";
  return "text-zinc-500 dark:text-zinc-400";
}

function getStatus(diffPercent: number) {
  if (diffPercent < -5) return "低价";
  if (diffPercent > 18) return "高价";
  if (diffPercent > 5) return "偏高";
  return "基准";
}

function getStatusDot(diffPercent: number) {
  if (diffPercent < -5) return "bg-emerald-500";
  if (diffPercent > 18) return "bg-rose-500";
  if (diffPercent > 5) return "bg-amber-500";
  return "bg-zinc-300";
}

function CountryFlag({ code }: { code: string }) {
  const countryCode = code.toUpperCase();
  const commonProps = {
    className: "h-5 w-7 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgba(24,24,27,0.08)]",
    viewBox: "0 0 28 20",
    role: "img",
    "aria-label": countryCode,
  };

  if (countryCode === "PH") {
    return (
      <svg {...commonProps}>
        <path d="M0 0h28v10H0z" fill="#0038a8" />
        <path d="M0 10h28v10H0z" fill="#ce1126" />
        <path d="M0 0l12 10L0 20z" fill="#fff" />
        <circle cx="4.4" cy="10" r="1.4" fill="#fcd116" />
      </svg>
    );
  }

  if (countryCode === "JP") {
    return (
      <svg {...commonProps}>
        <path d="M0 0h28v20H0z" fill="#fff" />
        <circle cx="14" cy="10" r="5.2" fill="#bc002d" />
      </svg>
    );
  }

  if (countryCode === "US") {
    return (
      <svg {...commonProps}>
        <path d="M0 0h28v20H0z" fill="#b22234" />
        {Array.from({ length: 6 }).map((_, index) => (
          <path
            key={`us-stripe-${index}`}
            d={`M0 ${2 + index * 3}h28v1.5H0z`}
            fill="#fff"
          />
        ))}
        <path d="M0 0h12.4v10.8H0z" fill="#3c3b6e" />
      </svg>
    );
  }

  if (countryCode === "CA") {
    return (
      <svg {...commonProps}>
        <path d="M0 0h7v20H0zM21 0h7v20h-7z" fill="#d52b1e" />
        <path d="M7 0h14v20H7z" fill="#fff" />
        <path d="M14 4l1.3 3 2.7-.7-1.5 2.4 2.4 1-2.8 1 .7 2.9-2.8-1.8-2.8 1.8.7-2.9-2.8-1 2.4-1L10 6.3l2.7.7z" fill="#d52b1e" />
      </svg>
    );
  }

  return (
    <span className="flex h-5 w-7 items-center justify-center rounded-[4px] bg-zinc-100 text-[10px] font-semibold text-zinc-500 shadow-[0_0_0_1px_rgba(24,24,27,0.08)] dark:bg-zinc-800 dark:text-zinc-300">
      {countryCode}
    </span>
  );
}

function RegionPriceRow({
  region,
  rank,
  referencePrice,
  displayCurrency,
  displayCurrencyLabel,
  formatDisplayPrice,
  showSourceColumn,
}: {
  region: RegionPrice;
  rank: number;
  referencePrice: number;
  displayCurrency: "usd" | "cny";
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  showSourceColumn: boolean;
}) {
  const diffPercent = getDiffPercent(region, referencePrice);
  const columns = showSourceColumn
    ? "md:grid-cols-[48px_minmax(150px,1.15fr)_132px_116px_138px_minmax(160px,1fr)_100px_104px]"
    : "md:grid-cols-[48px_minmax(160px,1.2fr)_132px_116px_138px_minmax(170px,1fr)_104px]";

  return (
    <div
      className={[
        "grid gap-3 border-b border-zinc-100 px-5 py-3 last:border-b-0 md:items-center md:px-6 dark:border-zinc-800",
        columns,
      ].join(" ")}
    >
      <div className="text-sm tabular-nums text-zinc-400">{rank}</div>

      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800"
          aria-label={region.code}
          title={region.code}
        >
          <CountryFlag code={region.code} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">
            {region.country}
          </div>
          <div className="mt-0.5 truncate text-xs text-zinc-400 md:hidden">
            {region.localPrice}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">本地价格</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {region.localPrice}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {displayCurrency === "cny" ? "人民币折算" : "美元折算"}
        </div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatDisplayPrice(region.priceUsd)}
          <span className="ml-0.5 text-xs font-normal text-zinc-400">
            {displayCurrency === "cny" ? "/月" : "/mo"}
          </span>
        </div>
        {displayCurrency === "cny" ? (
          <div className="mt-0.5 text-xs text-zinc-400">{displayCurrencyLabel}</div>
        ) : null}
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">对比美国</div>
        <div className={`text-sm font-medium ${getDiffTone(diffPercent)}`}>
          {getDiffText(diffPercent)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-xs text-zinc-400 md:hidden">税费</div>
        <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">
          {region.tax || "税费信息待核实"}
        </div>
      </div>

      {showSourceColumn ? (
        <div>
          <div className="mb-1 text-xs text-zinc-400 md:hidden">来源</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {getRegionPlatformLabel(region)}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">状态</div>
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${getStatusDot(diffPercent)}`} />
          {getStatus(diffPercent)}
        </div>
      </div>
    </div>
  );
}

export default function ExpandableRegionPriceTable({
  plan,
  initialVisibleCount = 8,
  platformLabel,
  displayCurrency = "usd",
  displayCurrencyLabel = "美元 USD",
  formatDisplayPrice = formatUsd,
  showPlatformFilter = true,
  showSourceColumn = false,
}: Props) {
  const [platform, setPlatform] = useState<PlatformFilter>(() =>
    getDefaultPlatform(plan.regions),
  );

  const platformCounts = useMemo(() => {
    return plan.regions.reduce<Record<string, number>>((counts, region) => {
      const key = getPlatform(region);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [plan.regions]);

  const effectivePlatform = showPlatformFilter ? platform : "all";

  const filteredRegions = useMemo(() => {
    if (effectivePlatform === "all") return getSortedRegions(plan.regions);

    return getSortedRegions(
      plan.regions.filter((region) => getPlatform(region) === effectivePlatform),
    );
  }, [plan.regions, effectivePlatform]);

  const referenceRegion = getReferenceRegion(filteredRegions);
  const referencePrice = referenceRegion?.priceUsd || 0;
  const activePlatformLabel =
    platformLabel ||
    (effectivePlatform === "all" ? "全部平台" : getPlatformLabel(effectivePlatform));
  const activeIndex = platformOptions.findIndex(
    (option) => option.value === effectivePlatform,
  );
  const shouldShowSourceColumn = showSourceColumn || (showPlatformFilter && effectivePlatform === "all");
  const displayPriceColumnLabel =
    displayCurrency === "cny" ? "人民币折算" : "美元折算";
  const sortCurrencyLabel =
    displayCurrency === "cny" ? "人民币折算价" : "美元折算价";

  const visibleRegions = filteredRegions.slice(0, initialVisibleCount);
  const hiddenRegions = filteredRegions.slice(initialVisibleCount);
  const headerColumns = shouldShowSourceColumn
    ? "md:grid-cols-[48px_minmax(150px,1.15fr)_132px_116px_138px_minmax(160px,1fr)_100px_104px]"
    : "md:grid-cols-[48px_minmax(160px,1.2fr)_132px_116px_138px_minmax(170px,1fr)_104px]";

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow="Region prices"
        title={`${plan.name} 地区价格明细`}
        description={`当前按 ${activePlatformLabel} 来源展示，按${sortCurrencyLabel}从低到高排序。`}
        actions={
          <div className="text-xs text-zinc-400">
            {filteredRegions.length} 个地区
          </div>
        }
      />

      {showPlatformFilter ? (
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="relative grid w-full grid-cols-4 rounded-xl bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200 sm:w-[520px] dark:bg-zinc-800 dark:ring-zinc-700">
            <div
              className="absolute bottom-1 top-1 rounded-lg bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-zinc-950"
              style={{
                left: "0.25rem",
                width: "calc((100% - 0.5rem) / 4)",
                transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              }}
            />
            {platformOptions.map((option) => {
              const count =
                option.value === "all"
                  ? plan.regions.length
                  : platformCounts[option.value] || 0;
              const active = platform === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlatform(option.value)}
                  className={[
                    "relative z-10 flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors",
                    active
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  ].join(" ")}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="text-xs text-zinc-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden">
        <div
          className={[
            "hidden gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40",
            headerColumns,
          ].join(" ")}
        >
          <div>排名</div>
          <div className="pl-[52px]">地区</div>
          <div>本地价格</div>
          <div>{displayPriceColumnLabel}</div>
          <div>对比美国</div>
          <div>税费</div>
          {shouldShowSourceColumn ? <div>来源</div> : null}
          <div className="pl-4">状态</div>
        </div>

        {filteredRegions.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">
            暂无 {activePlatformLabel} 价格数据。
          </div>
        ) : (
          <>
            <div>
              {visibleRegions.map((region, index) => (
                <RegionPriceRow
                  key={`${plan.slug}-${region.code}-${region.billingPlatform || "unknown"}`}
                  region={region}
                  rank={index + 1}
                  referencePrice={referencePrice}
                  displayCurrency={displayCurrency}
                  displayCurrencyLabel={displayCurrencyLabel}
                  formatDisplayPrice={formatDisplayPrice}
                  showSourceColumn={shouldShowSourceColumn}
                />
              ))}
            </div>

            <AppleStyleExpandableRows
              hiddenCount={hiddenRegions.length}
              showLabel={`显示更多 ${hiddenRegions.length} 个地区`}
              hideLabel="收起地区列表"
            >
              {hiddenRegions.map((region, index) => (
                <RegionPriceRow
                  key={`${plan.slug}-${region.code}-${region.billingPlatform || "unknown"}`}
                  region={region}
                  rank={initialVisibleCount + index + 1}
                  referencePrice={referencePrice}
                  displayCurrency={displayCurrency}
                  displayCurrencyLabel={displayCurrencyLabel}
                  formatDisplayPrice={formatDisplayPrice}
                  showSourceColumn={shouldShowSourceColumn}
                />
              ))}
            </AppleStyleExpandableRows>
          </>
        )}
      </div>
    </PublicSection>
  );
}
