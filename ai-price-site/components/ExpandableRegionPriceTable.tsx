"use client";

import type { FocusEvent, MouseEvent } from "react";
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
  { value: "ios", label: "App Store" },
  { value: "web", label: "Web 线索" },
  { value: "android", label: "Google Play 线索" },
  { value: "all", label: "全部诊断" },
];

function getPlatform(region: RegionPrice) {
  const platform = (region.billingPlatform || "unknown").toLowerCase();
  return platform === "google_play" ? "android" : platform;
}

function getPlatformLabel(value: string) {
  const platform = value.toLowerCase();

  if (platform === "ios") return "App Store";
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

function getRiskLabel(level: RegionPrice["riskLevel"]) {
  if (level === "low") return "低";
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "待核实";
}

function getRiskClass(level: RegionPrice["riskLevel"]) {
  if (level === "low") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800";
  }

  if (level === "high") {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800";
  }

  if (level === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800";
  }

  return "bg-zinc-50 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800";
}

function getTaxConfidenceLabel(confidence: RegionPrice["taxConfidence"]) {
  if (confidence === "high") return "高可信";
  if (confidence === "medium") return "中可信";
  return "待核验";
}

function getTaxConfidenceClass(confidence: RegionPrice["taxConfidence"]) {
  if (confidence === "high") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800";
  }

  if (confidence === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800";
  }

  return "bg-zinc-50 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800";
}

function formatTaxDisplay(region: RegionPrice) {
  const raw = (region.tax || "").trim();

  if (region.taxReviewStatus === "needs_review" || region.taxConfidence === "low") {
    return "待核验";
  }

  const includeMatch = raw.match(/^Includes\s+(.+)$/i);
  if (includeMatch) {
    const value = includeMatch[1]
      .replace(/consumption tax/i, "消费税")
      .replace(/sales tax/i, "销售税");
    return `含 ${value}`;
  }

  if (/GST\/HST varies by province/i.test(raw)) {
    return "各省 5-15% GST/HST 不同";
  }

  if (/State ICMS varies/i.test(raw)) {
    return "州税（ICMS）不同";
  }

  if (/Sales tax varies by state/i.test(raw)) {
    return "各州销售税不同";
  }

  if (raw) return raw;
  return "结算页为准";
}

function getTaxTooltip(region: RegionPrice) {
  const note = region.taxFrontendNote || region.tax || "";
  const base =
    region.taxReviewStatus === "verified" && region.taxConfidence === "high"
      ? "税费资料来自国家税务资料库，高可信。"
      : region.taxConfidence === "medium"
        ? "税费资料可作参考，仍需按结算页确认。"
        : "该地区税费资料尚未核验，最终以结算页为准。";

  return [
    base,
    note,
    region.taxCalculationPolicy === "do_not_calculate"
      ? "GeoSub 不把税率额外加入采集价格，价格排序使用 App Store 标价折算。"
      : "",
  ].filter(Boolean).join(" ");
}

function CountryFlag({ code }: { code: string }) {
  const countryCode = code.toUpperCase();
  const isIso2 = /^[A-Z]{2}$/.test(countryCode);
  const [imageFailed, setImageFailed] = useState(false);

  if (isIso2 && !imageFailed) {
    return (
      <img
        src={`/flags/${countryCode.toLowerCase()}.svg`}
        alt={countryCode}
        title={countryCode}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="h-5 w-7 rounded-[4px] object-cover shadow-[0_0_0_1px_rgba(24,24,27,0.08)]"
      />
    );
  }

  return (
    <span className="flex h-5 w-7 items-center justify-center rounded-[4px] bg-zinc-100 text-[10px] font-semibold text-zinc-500 shadow-[0_0_0_1px_rgba(24,24,27,0.08)] dark:bg-zinc-800 dark:text-zinc-300">
      {countryCode}
    </span>
  );
}

function HeaderHelp({
  label,
  help,
  className = "",
}: {
  label: string;
  help: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  function showTooltip(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setOpen(true);
  }

  return (
    <div className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold leading-none text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300/60"
        aria-label={`${label}说明：${help}`}
        onMouseEnter={showTooltip}
        onFocus={showTooltip}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span
          className="pointer-events-none fixed z-[80] max-w-[240px] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-normal leading-5 text-zinc-600 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          style={{ left: position.x, top: position.y }}
        >
          {help}
        </span>
      ) : null}
    </div>
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
    ? "md:grid-cols-[44px_minmax(142px,1.05fr)_120px_108px_124px_minmax(136px,1fr)_82px_118px]"
    : "md:grid-cols-[44px_minmax(150px,1.05fr)_122px_108px_124px_minmax(144px,1fr)_118px]";
  const riskNote = [region.riskNote, region.riskFactors].filter(Boolean).join(" ");
  const taxDisplay = formatTaxDisplay(region);
  const taxTooltip = getTaxTooltip(region);

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
        <div className="mb-1 text-xs text-zinc-400 md:hidden">税费说明</div>
        <div
          className="min-w-0"
          title={taxTooltip}
        >
          <div className="truncate text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {taxDisplay}
          </div>
          <span
            className={[
              "mt-1 inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset",
              getTaxConfidenceClass(region.taxConfidence),
            ].join(" ")}
          >
            {getTaxConfidenceLabel(region.taxConfidence)}
          </span>
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
        <div className="mb-1 text-xs text-zinc-400 md:hidden">状态/风险</div>
        <div
          className="inline-flex min-w-0 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
          title={riskNote || "跨区订阅可能受账号地区、付款方式和平台风控影响。"}
        >
          <span className={`h-2 w-2 rounded-full ${getStatusDot(diffPercent)}`} />
          <span className="shrink-0">{getStatus(diffPercent)}</span>
          <span
            className={[
              "hidden h-5 shrink-0 items-center rounded-full px-1.5 text-[11px] font-medium ring-1 ring-inset xl:inline-flex",
              getRiskClass(region.riskLevel),
            ].join(" ")}
          >
            风险{getRiskLabel(region.riskLevel)}
          </span>
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
    (effectivePlatform === "all" ? "全部来源诊断" : getPlatformLabel(effectivePlatform));
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
    ? "md:grid-cols-[44px_minmax(142px,1.05fr)_120px_108px_124px_minmax(136px,1fr)_82px_118px]"
    : "md:grid-cols-[44px_minmax(150px,1.05fr)_122px_108px_124px_minmax(144px,1fr)_118px]";

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow="Region prices"
        title={`${plan.name} 地区价格明细`}
        description={`V1 正式榜单优先按 App Store 展示；当前视图为 ${activePlatformLabel}，按${sortCurrencyLabel}从低到高排序。`}
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
          <HeaderHelp
            label={displayPriceColumnLabel}
            help="把本地价格按汇率折算成统一货币，方便横向比较。"
          />
          <HeaderHelp
            label="对比美国"
            help="以美国地区价格为基准，显示该地区便宜或贵多少。"
          />
          <HeaderHelp
            label="税费说明"
            help="当地 VAT、GST、消费税或销售税说明，仅作背景参考；价格排序不额外加税，最终以 App Store 结算页为准。"
          />
          {shouldShowSourceColumn ? <div>来源</div> : null}
          <HeaderHelp
            label="状态/风险"
            help="状态表示该地区价格相对美国是低价、基准、偏高或高价；风险表示跨区订阅时账号地区、付款方式、账单信息和平台风控的综合判断。"
            className="pl-4"
          />
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

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 text-xs leading-5 text-zinc-500 md:px-6 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        风险提示：GeoSub 展示公开价格差异，方便比较不同地区的订阅成本，不鼓励规避平台规则。跨地区订阅可能受到 Apple ID 地区、付款方式、账单信息、税费和平台风控影响，最终是否可订阅请以官方结算页面为准。
      </div>
    </PublicSection>
  );
}
