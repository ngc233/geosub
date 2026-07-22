"use client";

import Image from "next/image";
import type { FocusEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { formatUsd } from "../lib/public-pricing-model";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getPublicPricingCopy } from "../lib/public-pricing-copy";
import type { SiteLocale } from "../lib/site-locale";

type PlatformFilter = "ios" | "web" | "android" | "all";

type Props = {
  plan: ProductPlan;
  initialVisibleCount?: number;
  locale?: SiteLocale;
  platformLabel?: string;
  displayCurrency?: "usd" | "cny";
  displayCurrencyLabel?: string;
  formatDisplayPrice?: (value: number) => string;
  showPlatformFilter?: boolean;
  showSourceColumn?: boolean;
};

const platformOptions: Array<{ value: PlatformFilter }> = [
  { value: "ios" },
  { value: "web" },
  { value: "android" },
  { value: "all" },
];

function getPlatformOptionLabel(
  value: PlatformFilter,
  locale: SiteLocale,
) {
  const copy = getPublicPricingCopy(locale).table;
  if (value === "ios") return "App Store";
  if (value === "web") return copy.webLead;
  if (value === "android") return copy.googlePlayLead;
  return copy.allDiagnostics;
}

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

function getDiffTextByLocale(diffPercent: number, locale: SiteLocale) {
  const copy = getPublicPricingCopy(locale).table;
  if (diffPercent === 0) return copy.sameAsUs;
  if (diffPercent > 0) return copy.aboveUs(diffPercent);
  return copy.belowUs(Math.abs(diffPercent));
}

function getDiffTone(diffPercent: number) {
  if (diffPercent < -5) return "text-emerald-700 dark:text-emerald-300";
  if (diffPercent > 18) return "text-rose-600 dark:text-rose-300";
  if (diffPercent > 5) return "text-amber-700 dark:text-amber-300";
  return "text-zinc-500 dark:text-zinc-400";
}

function getStatusByLocale(diffPercent: number, locale: SiteLocale) {
  const copy = getPublicPricingCopy(locale).table;
  if (diffPercent < -5) return copy.statusLow;
  if (diffPercent > 18) return copy.statusHigh;
  if (diffPercent > 5) return copy.statusAbove;
  return copy.statusBase;
}

function getStatusDot(diffPercent: number) {
  if (diffPercent < -5) return "bg-emerald-500";
  if (diffPercent > 18) return "bg-rose-500";
  if (diffPercent > 5) return "bg-amber-500";
  return "bg-zinc-300";
}

function getRiskLabel(level: RegionPrice["riskLevel"], locale: SiteLocale) {
  const copy = getPublicPricingCopy(locale).table;
  if (level === "low") return copy.riskLow;
  if (level === "high") return copy.riskHigh;
  if (level === "medium") return copy.riskMedium;
  return copy.riskNeedsReview;
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

function getTaxConfidenceLabel(region: RegionPrice, locale: SiteLocale) {
  const copy = getPublicPricingCopy(locale).table;
  if (region.taxSourceKind === "inferred") return copy.taxInferred;
  if (region.taxConfidence === "high") return copy.taxVerified;
  if (region.taxConfidence === "medium") return copy.taxMedium;
  if (region.taxConfidence === "low") return copy.taxNeedsReview;
  return copy.taxUnverified;
}

function getTaxConfidenceClass(region: RegionPrice) {
  if (region.taxConfidence === "high") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800";
  }

  if (region.taxSourceKind === "inferred") {
    return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800";
  }

  if (region.taxConfidence === "medium" || region.taxConfidence === "low") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800";
  }

  return "bg-zinc-50 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800";
}

function getTaxTooltipDotClass(region: RegionPrice) {
  if (region.taxConfidence === "high") return "bg-emerald-500";
  if (region.taxSourceKind === "inferred") return "bg-blue-500";
  if (region.taxConfidence === "medium" || region.taxConfidence === "low") return "bg-amber-500";
  return "bg-zinc-400";
}

function translateTaxTextToZh(value: string) {
  const raw = value.trim();
  const includeMatch = raw.match(/^(?:Includes|Usually includes)\s+(.+)$/i);

  if (includeMatch) {
    const label = includeMatch[1]
      .replace(/consumption tax/i, "消费税")
      .replace(/service tax/i, "服务税")
      .replace(/sales tax/i, "销售税")
      .replace(/by region/i, "因地区不同");

    return /^Usually includes/i.test(raw) ? `通常含 ${label}` : `含 ${label}`;
  }

  const provinceMatch = raw.match(/^GST\/HST varies by province(?:,\s*(.+))?$/i);
  if (provinceMatch) {
    return provinceMatch[1]
      ? `各省 ${provinceMatch[1]} GST/HST 不同`
      : "各省 GST/HST 不同";
  }

  if (/State ICMS varies/i.test(raw)) return "州税（ICMS）不同";
  if (/Sales tax varies by state/i.test(raw)) return "各州销售税不同";
  if (/Sales tax varies by region/i.test(raw)) return "销售税因地区不同";
  if (/VAT treatment needs review/i.test(raw)) return "VAT 规则需复核";
  if (/Usually GST-inclusive/i.test(raw)) return "通常已含 GST，最终以结算页为准";
  if (/Usually VAT-inclusive/i.test(raw)) return "通常已含 VAT，最终以结算页为准";
  if (/App Store list price.*GST-inclusive/i.test(raw)) {
    return "App Store 标价通常已含 GST，最终以结算页为准";
  }
  if (/App Store list price.*VAT-inclusive/i.test(raw)) {
    return "App Store 标价通常已含 VAT，最终以结算页为准";
  }
  if (/Digital service tax treatment may vary/i.test(raw)) {
    return "数字服务税务规则可能随服务类别变化，最终以结算页为准";
  }
  if (/No country tax-rate profile matched yet/i.test(raw)) {
    return "未匹配到国家税率资料；最终以 App Store 结算页为准";
  }
  if (/final checkout applies/i.test(raw)) return "最终以结算页为准";

  return raw;
}

function formatTaxDisplay(region: RegionPrice, locale: SiteLocale) {
  const raw = (region.tax || "").trim();
  const copy = getPublicPricingCopy(locale).table;

  if (!raw && (region.taxReviewStatus === "needs_review" || region.taxConfidence === "low")) {
    return copy.taxNeedsReview;
  }

  if (locale !== "zh") {
    return raw || copy.checkoutApplies;
  }

  return raw ? translateTaxTextToZh(raw) : copy.checkoutApplies;
}

function getTaxTooltip(region: RegionPrice, locale: SiteLocale) {
  const copy = getPublicPricingCopy(locale).table;
  const noteRaw = region.taxFrontendNote || region.tax || "";
  const note = locale === "zh" ? translateTaxTextToZh(noteRaw) : noteRaw;
  const base =
    region.taxReviewStatus === "verified" && region.taxConfidence === "high"
      ? copy.taxVerifiedHelp
      : region.taxSourceKind === "inferred"
        ? copy.taxInferredHelp
        : region.taxConfidence === "medium"
          ? copy.taxMediumHelp
          : copy.taxUnverifiedHelp;

  return [
    base,
    note,
    region.taxCalculationPolicy === "do_not_calculate"
      ? copy.taxRankingPolicy
      : "",
  ].filter(Boolean).join(" ");
}

function TaxTooltip({
  region,
  taxDisplay,
  locale,
}: {
  region: RegionPrice;
  taxDisplay: string;
  locale: SiteLocale;
}) {
  const [open, setOpen] = useState(false);
  const label = getTaxConfidenceLabel(region, locale);
  const tooltip = getTaxTooltip(region, locale);

  return (
    <div
      className="relative inline-flex max-w-full flex-col items-start"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <div className="max-w-full truncate text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        {taxDisplay}
      </div>
      <span
        className={[
          "mt-1 inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset",
          getTaxConfidenceClass(region),
        ].join(" ")}
      >
        {label}
      </span>
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute left-0 top-full z-[90] mt-2 w-[min(280px,calc(100vw-32px))] rounded-lg border border-zinc-200/80 bg-white/95 p-3 text-left text-xs leading-5 text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur transition duration-150 ease-out dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:text-zinc-300",
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        ].join(" ")}
      >
        <span className="mb-1.5 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${getTaxTooltipDotClass(region)}`} />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
        </span>
        <span className="block">{tooltip}</span>
      </span>
    </div>
  );
}

function CountryFlag({ code }: { code: string }) {
  const countryCode = code.toUpperCase();
  const isIso2 = /^[A-Z]{2}$/.test(countryCode);
  const [imageFailed, setImageFailed] = useState(false);

  if (isIso2 && !imageFailed) {
    return (
      <Image
        src={`/flags/${countryCode.toLowerCase()}.svg`}
        alt={countryCode}
        width={28}
        height={20}
        unoptimized
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
  locale,
  className = "",
}: {
  label: string;
  help: string;
  locale: SiteLocale;
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
        aria-label={getPublicPricingCopy(locale).table.helpAria(label, help)}
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

function RiskStatus({
  region,
  diffPercent,
  locale,
}: {
  region: RegionPrice;
  diffPercent: number;
  locale: SiteLocale;
}) {
  const [open, setOpen] = useState(false);
  const copy = getPublicPricingCopy(locale).table;
  const fallback = copy.riskFallback;
  const tooltip = [region.riskNote, region.riskFactors].filter(Boolean).join(" ") || fallback;
  const statusLabel = getStatusByLocale(diffPercent, locale);
  const riskLabel = copy.riskPrefix(getRiskLabel(region.riskLevel, locale));

  return (
    <div
      className="relative inline-flex min-w-0 items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex min-w-0 items-center gap-2 text-left text-sm text-zinc-500 outline-none transition hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-300/60 dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label={`${statusLabel} · ${riskLabel}: ${tooltip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDot(diffPercent)}`} />
        <span className="shrink-0">{statusLabel}</span>
        <span
          className={[
            "hidden h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset xl:inline-flex",
            getRiskClass(region.riskLevel),
          ].join(" ")}
        >
          {riskLabel}
        </span>
      </button>
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute right-0 top-full z-[90] mt-2 w-[min(280px,calc(100vw-32px))] rounded-lg border border-zinc-200/80 bg-white/95 p-3 text-left text-xs leading-5 text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur transition duration-150 ease-out dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:text-zinc-300",
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        ].join(" ")}
      >
        <span className="mb-1.5 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(diffPercent)}`} />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {statusLabel} · {riskLabel}
          </span>
        </span>
        <span className="block">{tooltip}</span>
      </span>
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
  locale,
}: {
  region: RegionPrice;
  rank: number;
  referencePrice: number;
  displayCurrency: "usd" | "cny";
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  showSourceColumn: boolean;
  locale: SiteLocale;
}) {
  const diffPercent = getDiffPercent(region, referencePrice);
  const columns = showSourceColumn
    ? "md:grid-cols-[44px_minmax(142px,1.05fr)_120px_108px_124px_minmax(136px,1fr)_82px_118px]"
    : "md:grid-cols-[44px_minmax(150px,1.05fr)_122px_108px_124px_minmax(144px,1fr)_118px]";
  const taxDisplay = formatTaxDisplay(region, locale);
  const copy = getPublicPricingCopy(locale).table;

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
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {copy.localPrice}
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {region.localPrice}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {displayCurrency === "cny" ? copy.cnyEstimate : copy.usdEquivalent}
        </div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatDisplayPrice(region.priceUsd)}
          <span className="ml-0.5 text-xs font-normal text-zinc-400">
            {copy.perMonth}
          </span>
        </div>
        {displayCurrency === "cny" ? (
          <div className="mt-0.5 text-xs text-zinc-400">{displayCurrencyLabel}</div>
        ) : null}
        {region.lastCheckedAt || region.fxRateDate ? (
          <div className="mt-0.5 text-xs text-zinc-400">
            {region.lastCheckedAt ? `${copy.priceCollected} ${region.lastCheckedAt}` : ""}
            {region.lastCheckedAt && region.fxRateDate ? " · " : ""}
            {region.fxRateDate ? `${copy.fxBasis} ${region.fxRateDate}` : ""}
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {copy.vsUs}
        </div>
        <div className={`text-sm font-medium ${getDiffTone(diffPercent)}`}>
          {getDiffTextByLocale(diffPercent, locale)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {copy.taxNote}
        </div>
        <TaxTooltip region={region} taxDisplay={taxDisplay} locale={locale} />
      </div>

      {showSourceColumn ? (
        <div>
          <div className="mb-1 text-xs text-zinc-400 md:hidden">
            {copy.source}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {getRegionPlatformLabel(region)}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {copy.statusRisk}
        </div>
        <RiskStatus region={region} diffPercent={diffPercent} locale={locale} />
      </div>
    </div>
  );
}

export default function ExpandableRegionPriceTable({
  plan,
  initialVisibleCount = 8,
  locale = "zh",
  platformLabel,
  displayCurrency = "usd",
  displayCurrencyLabel,
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
  const copy = getPublicPricingCopy(locale).table;
  const effectiveDisplayCurrencyLabel =
    displayCurrencyLabel || copy.usd;
  const activePlatformLabel =
    platformLabel ||
    (effectivePlatform === "all"
      ? copy.allSources
      : getPlatformLabel(effectivePlatform));
  const activeIndex = platformOptions.findIndex(
    (option) => option.value === effectivePlatform,
  );
  const shouldShowSourceColumn = showSourceColumn || (showPlatformFilter && effectivePlatform === "all");
  const displayPriceColumnLabel =
    displayCurrency === "cny" ? copy.cnyEstimate : copy.usdEquivalent;
  const sortCurrencyLabel =
    displayCurrency === "cny" ? copy.cnySort : copy.usdSort;

  const visibleRegions = filteredRegions.slice(0, initialVisibleCount);
  const hiddenRegions = filteredRegions.slice(initialVisibleCount);
  const headerColumns = shouldShowSourceColumn
    ? "md:grid-cols-[44px_minmax(142px,1.05fr)_120px_108px_124px_minmax(136px,1fr)_82px_118px]"
    : "md:grid-cols-[44px_minmax(150px,1.05fr)_122px_108px_124px_minmax(144px,1fr)_118px]";

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title(plan.name)}
        description={copy.description(activePlatformLabel, sortCurrencyLabel)}
        actions={
          <div className="text-xs text-zinc-400">
            {copy.regionCount(filteredRegions.length)}
          </div>
        }
      />

      {showPlatformFilter ? (
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="relative grid w-full grid-cols-4 rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200 sm:w-[520px] dark:bg-zinc-800 dark:ring-zinc-700">
            <div
              className="absolute bottom-1 top-1 rounded-md bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-zinc-950"
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
                    "relative z-10 flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors",
                    active
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  ].join(" ")}
                >
                  <span className="truncate">
                    {getPlatformOptionLabel(option.value, locale)}
                  </span>
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
          <div>{copy.rank}</div>
          <div className="pl-[52px]">{copy.region}</div>
          <div>{copy.localPrice}</div>
          <HeaderHelp
            label={displayPriceColumnLabel}
            help={copy.convertedHelp}
            locale={locale}
          />
          <HeaderHelp
            label={copy.vsUs}
            help={copy.vsUsHelp}
            locale={locale}
          />
          <HeaderHelp
            label={copy.taxNote}
            help={copy.taxHelp}
            locale={locale}
          />
          {shouldShowSourceColumn ? <div>{copy.source}</div> : null}
          <HeaderHelp
            label={copy.statusRisk}
            help={copy.riskHelp}
            locale={locale}
            className="pl-4"
          />
        </div>

        {filteredRegions.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">
            {copy.empty(activePlatformLabel)}
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
                  displayCurrencyLabel={effectiveDisplayCurrencyLabel}
                  formatDisplayPrice={formatDisplayPrice}
                  showSourceColumn={shouldShowSourceColumn}
                  locale={locale}
                />
              ))}
            </div>

            <AppleStyleExpandableRows
              hiddenCount={hiddenRegions.length}
              showLabel={copy.showMore(hiddenRegions.length)}
              hideLabel={copy.collapse}
            >
              {hiddenRegions.map((region, index) => (
                <RegionPriceRow
                  key={`${plan.slug}-${region.code}-${region.billingPlatform || "unknown"}`}
                  region={region}
                  rank={initialVisibleCount + index + 1}
                  referencePrice={referencePrice}
                  displayCurrency={displayCurrency}
                  displayCurrencyLabel={effectiveDisplayCurrencyLabel}
                  formatDisplayPrice={formatDisplayPrice}
                  showSourceColumn={shouldShowSourceColumn}
                  locale={locale}
                />
              ))}
            </AppleStyleExpandableRows>
          </>
        )}
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 text-xs leading-5 text-zinc-500 md:px-6 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        {copy.riskNote}
      </div>
    </PublicSection>
  );
}
