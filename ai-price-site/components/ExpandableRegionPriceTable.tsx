"use client";

import AnimatedDisclosure from "./ui/AnimatedDisclosure";
import CountryFlag from "./CountryFlag";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Plus, Scale, Search, X } from "lucide-react";
import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { matchesRelation, priceDifference, pricePreview, taxSummary, type PriceRelation } from "../lib/pricing-r2";
import { useDesktopLayout } from "./useDesktopLayout";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { formatUsd } from "../lib/public-pricing-model";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";
import { PublicButton, PublicCheckbox, PublicFilters, PublicIconButton, PublicInput, PublicSelect, PublicTextButton } from "./ui/PublicControls";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getLocalizedRegionName } from "../lib/locale-format";
import { getRegionPriceTableCopy } from "../lib/region-price-table-copy";
import { getBillingSourceText } from "../lib/billing-source-copy";
import type { PreparedSiteLocale } from "../lib/site-locale";
import { localizeTaxNote } from "../lib/tax-note-localization";
import { getBillingCycleSuffix } from "../lib/billing-cycle-label";
import {
  assessSubscriptionAccess,
  getSubscriptionAccessCopy,
} from "../lib/subscription-access";
import {
  filterRegionPrices,
  getRegionPriceToolbarCopy,
  type RegionPriceQuickFilter,
} from "../lib/region-price-toolbar";
import {
  getRegionComparisonKey,
  getRegionPriceDecisionCopy,
  REGION_COMPARISON_LIMIT,
  toggleRegionComparison,
} from "../lib/region-price-decision";

type PlatformFilter = "ios" | "web" | "android" | "all";

type Props = {
  variant?: "classic" | "r2";
  appearance?: "public";
  plan: ProductPlan;
  initialVisibleCount?: number;
  locale?: PreparedSiteLocale;
  platformLabel?: string;
  displayCurrency?: string;
  displayCurrencyLabel?: string;
  formatDisplayPrice?: (value: number) => string;
  toolbarCurrencyControl?: ReactNode;
  showPlatformFilter?: boolean;
  showSourceColumn?: boolean;
};

const platformOptions: Array<{ value: PlatformFilter }> = [
  { value: "ios" },
  { value: "web" },
  { value: "android" },
  { value: "all" },
];

const quickFilterOptions: RegionPriceQuickFilter[] = [
  "all",
  "belowReference",
  "trustedTax",
  "traceableSource",
];

function getPlatformOptionLabel(
  value: PlatformFilter,
  locale: PreparedSiteLocale,
) {
  const copy = getRegionPriceTableCopy(locale);
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

function getDiffTextByLocale(
  diffPercent: number,
  locale: PreparedSiteLocale,
  hasUsReference: boolean,
) {
  if (!hasUsReference) {
    if (diffPercent === 0) return "0%";
    return `${diffPercent > 0 ? "+" : ""}${diffPercent}%`;
  }

  const copy = getRegionPriceTableCopy(locale);
  if (diffPercent === 0) return copy.sameAsUs;
  if (diffPercent > 0) return copy.aboveUs(diffPercent);
  return copy.belowUs(Math.abs(diffPercent));
}

function getDiffTone(diffPercent: number) {
  if (diffPercent < -5) return "gs-data-low text-[#3f7d20] dark:text-[#bef264]";
  if (diffPercent > 5) return "gs-data-high text-[#a24b3a] dark:text-[#f0a08f]";
  return "text-zinc-500 dark:text-zinc-400";
}

function getStatusByLocale(
  diffPercent: number,
  locale: PreparedSiteLocale,
) {
  const copy = getRegionPriceTableCopy(locale);
  if (diffPercent < -5) return copy.statusLow;
  if (diffPercent > 18) return copy.statusHigh;
  if (diffPercent > 5) return copy.statusAbove;
  return copy.statusBase;
}

function getStatusDot(diffPercent: number) {
  if (diffPercent < -5) return "bg-[#84cc16]";
  if (diffPercent > 18) return "bg-[#c56550]";
  if (diffPercent > 5) return "bg-[#e6b8ad]";
  return "bg-zinc-300";
}

function getTaxConfidenceLabel(
  region: RegionPrice,
  locale: PreparedSiteLocale,
) {
  const copy = getRegionPriceTableCopy(locale);
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

function formatTaxDisplay(
  region: RegionPrice,
  locale: PreparedSiteLocale,
) {
  const raw = (region.tax || "").trim();
  const billingChannel = getPlatform(region) === "web" ? "Web" : "App Store";
  const copy = getRegionPriceTableCopy(locale, billingChannel);

  if (!raw && (region.taxReviewStatus === "needs_review" || region.taxConfidence === "low")) {
    return copy.taxNeedsReview;
  }

  const note = raw
    ? localizeTaxNote(raw, locale, {
        unknownFallback: locale !== "zh" && locale !== "en",
      })
    : copy.checkoutApplies;
  return getBillingSourceText(note, billingChannel);
}

function getTaxTooltip(
  region: RegionPrice,
  locale: PreparedSiteLocale,
) {
  const billingChannel = getPlatform(region) === "web" ? "Web" : "App Store";
  const copy = getRegionPriceTableCopy(locale, billingChannel);
  const noteRaw = region.taxFrontendNote || region.tax || "";
  const note = localizeTaxNote(noteRaw, locale, {
    unknownFallback: locale !== "zh" && locale !== "en",
  });
  const base =
    region.taxReviewStatus === "verified" && region.taxConfidence === "high"
      ? copy.taxVerifiedHelp
      : region.taxSourceKind === "inferred"
        ? copy.taxInferredHelp
        : region.taxConfidence === "medium"
          ? copy.taxMediumHelp
          : copy.taxUnverifiedHelp;

  return joinTooltipParts([
    base,
    getBillingSourceText(note, billingChannel),
    region.taxCalculationPolicy === "do_not_calculate"
      ? copy.taxRankingPolicy
      : "",
  ]);
}

function joinTooltipParts(parts: Array<string | undefined>) {
  const sentences = parts
    .filter(Boolean)
    .flatMap((part) => part!.split(/(?<=[.!?。！？])\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();

  return sentences
    .filter((sentence) => {
      const normalized = sentence
        .toLocaleLowerCase()
        .replace(/[.!?。！？]+$/u, "")
        .replace(/\s+/g, " ");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((sentence) =>
      /[.!?。！？]$/u.test(sentence) ? sentence : `${sentence}.`,
    )
    .join(" ");
}

function TaxTooltip({
  region,
  taxDisplay,
  locale,
}: {
  region: RegionPrice;
  taxDisplay: string;
  locale: PreparedSiteLocale;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
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
      <button
        type="button"
        className="max-w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen(true)}
      >
        <span className="block max-w-full truncate text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {taxDisplay}
        </span>
        <span
          className={[
            "mt-1 inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset",
            getTaxConfidenceClass(region),
          ].join(" ")}
        >
          {label}
        </span>
      </button>
      <span
        id={tooltipId}
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

function HeaderHelp({
  label,
  help,
  locale,
  className = "",
}: {
  label: string;
  help: string;
  locale: PreparedSiteLocale;
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
        aria-label={getRegionPriceTableCopy(locale).helpAria(label, help)}
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

function SubscriptionConditions({
  region,
  diffPercent,
  locale,
}: {
  region: RegionPrice;
  diffPercent: number;
  locale: PreparedSiteLocale;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const accessCopy = getSubscriptionAccessCopy(locale);
  const assessment = assessSubscriptionAccess(region);
  const statusLabel = getStatusByLocale(diffPercent, locale);
  const hasAutomaticEvidence = assessment.facts.length > 0;

  return (
    <div
      className="relative inline-flex min-w-0 items-center"
      onMouseEnter={() => hasAutomaticEvidence && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasAutomaticEvidence && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className={`inline-flex min-w-0 items-center gap-2 text-left text-sm outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-zinc-300/60 ${getDiffTone(diffPercent)}`}
        aria-label={statusLabel}
        aria-expanded={hasAutomaticEvidence ? open : undefined}
        aria-describedby={hasAutomaticEvidence ? tooltipId : undefined}
        onClick={() => hasAutomaticEvidence && setOpen(true)}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDot(diffPercent)}`} />
        <span className="shrink-0">{statusLabel}</span>
      </button>
      {hasAutomaticEvidence ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={[
            "pointer-events-none absolute right-0 top-full z-[90] mt-2 w-[min(320px,calc(100vw-32px))] rounded-lg border border-zinc-200/80 bg-white/95 p-3 text-left text-xs leading-5 text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur transition duration-150 ease-out dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:text-zinc-300",
            open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          ].join(" ")}
        >
          <span className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#84cc16]" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {accessCopy.automaticTitle}
            </span>
          </span>
          <span className="grid gap-1.5">
            {assessment.facts.map((fact) => {
              const evidenceLabel =
                fact.key === "checked" && region.lastCheckedAt
                  ? accessCopy.checkedValue(region.lastCheckedAt)
                  : accessCopy.evidence.confirmed;

              return (
                <span
                  key={fact.key}
                  className="flex items-start justify-between gap-4 border-t border-zinc-100 pt-1.5 first:border-t-0 first:pt-0 dark:border-zinc-800"
                >
                  <span>{accessCopy.facts[fact.key]}</span>
                  <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                    {evidenceLabel}
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function RegionComparisonToggle({
  country,
  selected,
  disabled,
  locale,
  onClick,
}: {
  country: string;
  selected: boolean;
  disabled: boolean;
  locale: PreparedSiteLocale;
  onClick: () => void;
}) {
  const copy = getRegionPriceDecisionCopy(locale);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? copy.removeRegion(country) : copy.selectRegion(country)}
      title={disabled ? copy.compareLimit : undefined}
      className={[
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60",
        selected
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {selected ? (
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
      ) : (
        <Plus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
      )}
      <span>{copy.compare}</span>
    </button>
  );
}

export function RegionEvidencePanel({
  region,
  referencePrice,
  hasUsReference,
  displayCurrencyLabel,
  formatDisplayPrice,
  locale,
  panelId,
  compact = false,
  animated = false,
}: {
  region: RegionPrice;
  referencePrice: number;
  hasUsReference: boolean;
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  locale: PreparedSiteLocale;
  panelId: string;
  compact?: boolean;
  animated?: boolean;
}) {
  const decisionCopy = getRegionPriceDecisionCopy(locale);
  const accessCopy = getSubscriptionAccessCopy(locale);
  const assessment = assessSubscriptionAccess(region);
  const localizedCountry =
    getLocalizedRegionName(region.code, locale) || region.country;
  const diffPercent = getDiffPercent(region, referencePrice);
  const taxDisplay = formatTaxDisplay(region, locale);

  if (compact) return <div id={panelId} className="gs-r2-compact-evidence">
    <span>{locale === "en" ? "Tax: " : "税费："}{region.taxFrontendNote || region.tax || taxDisplay}</span>
    <span>{getTaxConfidenceLabel(region, locale)}</span>
    <span>{locale === "en" ? "Source: " : "来源："}{region.sourceName || getRegionPlatformLabel(region)}</span>
    {region.sourceUrl ? <a href={region.sourceUrl} target="_blank" rel="noreferrer">{locale === "en" ? "Original source" : "查看原始来源"}<ExternalLink size={14} aria-hidden="true" /></a> : <span>{decisionCopy.sourceUnavailable}</span>}
    {animated ? <AnimatedDisclosure className="gs-r2-full-evidence" headingLevel={3} title="完整证据"><RegionEvidencePanel region={region} referencePrice={referencePrice} hasUsReference={hasUsReference} displayCurrencyLabel={displayCurrencyLabel} formatDisplayPrice={formatDisplayPrice} locale={locale} panelId={`${panelId}-full`} /></AnimatedDisclosure> : <details><summary>{locale === "en" ? "More evidence" : "完整证据"}<ChevronDown size={14} aria-hidden="true" /></summary><RegionEvidencePanel region={region} referencePrice={referencePrice} hasUsReference={hasUsReference} displayCurrencyLabel={displayCurrencyLabel} formatDisplayPrice={formatDisplayPrice} locale={locale} panelId={`${panelId}-full`} /></details>}
  </div>;

  return (
    <div
      id={panelId}
      className="border-b border-zinc-200 bg-zinc-50/75 px-4 py-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-950/45"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-white">
            {decisionCopy.evidenceTitle(localizedCountry)}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {getRegionPlatformLabel(region)}
          </div>
        </div>
        {region.sourceUrl ? (
          <a
            href={region.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {decisionCopy.source}
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [decisionCopy.localPrice, region.localPrice],
          [decisionCopy.convertedPrice, `${formatDisplayPrice(region.priceUsd)} · ${displayCurrencyLabel}`],
          [
            decisionCopy.referenceDifference,
            referencePrice > 0 ? getDiffTextByLocale(diffPercent, locale, hasUsReference) : "—",
          ],
          [decisionCopy.taxStatus, `${taxDisplay} · ${getTaxConfidenceLabel(region, locale)}`],
          [decisionCopy.priceDate, region.lastCheckedAt || "—"],
          [decisionCopy.fxDate, region.fxRateDate || "—"],
          [decisionCopy.source, region.sourceName || getRegionPlatformLabel(region)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-t border-zinc-200/80 pt-2 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-400">{label}</div>
            <div className="mt-1 break-words text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
              {value}
            </div>
          </div>
        ))}
      </div>

      {region.observationId && (locale === "zh" || locale === "en") ? (
        <Link href={`/${locale}/price-records/${region.observationId}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--foreground)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
          {locale === "zh" ? "查看当时的原始套餐快照" : "View the original plan snapshot"}
          <ExternalLink size={14} aria-hidden="true" />
        </Link>
      ) : null}
      {assessment.facts.length > 0 ? (
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {accessCopy.automaticTitle}
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {assessment.facts.map((fact) => {
            const evidenceLabel =
              fact.key === "checked" && region.lastCheckedAt
                ? accessCopy.checkedValue(region.lastCheckedAt)
                : accessCopy.evidence.confirmed;

              return (
                <div key={fact.key} className="flex items-start justify-between gap-3 text-xs leading-5">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {accessCopy.facts[fact.key]}
                  </span>
                  <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                    {evidenceLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RegionComparisonPanel({
  regions,
  referencePrice,
  hasUsReference,
  displayCurrencyLabel,
  formatDisplayPrice,
  locale,
  onRemove,
  onClear,
}: {
  regions: RegionPrice[];
  referencePrice: number;
  hasUsReference: boolean;
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  locale: PreparedSiteLocale;
  onRemove: (region: RegionPrice) => void;
  onClear: () => void;
}) {
  const copy = getRegionPriceDecisionCopy(locale);

  return (
    <section
      className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/55"
      aria-label={copy.comparisonTitle}
    >
      <div className="flex items-start justify-between gap-4 px-4 py-3 md:px-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
            <Scale aria-hidden="true" className="h-4 w-4" />
            {copy.comparisonTitle}
            <span className="text-xs font-medium tabular-nums text-zinc-400">
              {copy.selected(regions.length)}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {copy.comparisonIntro}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          {copy.clearComparison}
        </button>
      </div>

      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="grid min-w-max border-t border-zinc-200 dark:border-zinc-800"
          style={{ gridTemplateColumns: `repeat(${regions.length}, minmax(210px, 1fr))` }}
        >
          {regions.map((region) => {
            const localizedCountry =
              getLocalizedRegionName(region.code, locale) || region.country;
            const diffPercent = getDiffPercent(region, referencePrice);

            return (
              <div
                key={getRegionComparisonKey(region)}
                className="min-w-[210px] border-e border-zinc-200 px-4 py-3 last:border-e-0 md:px-6 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CountryFlag code={region.code} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                        {localizedCountry}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-400">{region.code}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(region)}
                    aria-label={copy.removeRegion(localizedCountry)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">
                  {formatDisplayPrice(region.priceUsd)}
                </div>
                <div className="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {region.localPrice} · {displayCurrencyLabel}
                </div>
                <div className={`mt-2 text-xs font-semibold tabular-nums ${getDiffTone(diffPercent)}`}>
                  {referencePrice > 0 ? getDiffTextByLocale(diffPercent, locale, hasUsReference) : "—"}
                </div>
                <div className="mt-3 border-t border-zinc-200 pt-2 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div>{formatTaxDisplay(region, locale)}</div>
                  <div className="tabular-nums">
                    {region.lastCheckedAt || "—"} · {region.fxRateDate || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RegionPriceRow({
  region,
  rank,
  referencePrice,
  referenceCountry,
  hasUsReference,
  displayCurrency,
  displayCurrencyLabel,
  formatDisplayPrice,
  showSourceColumn,
  billingCycle,
  locale,
  comparisonSelected,
  comparisonDisabled,
  evidenceOpen,
  onToggleComparison,
  onToggleEvidence,
}: {
  region: RegionPrice;
  rank: number;
  referencePrice: number;
  referenceCountry: string;
  hasUsReference: boolean;
  displayCurrency: string;
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  showSourceColumn: boolean;
  billingCycle: ProductPlan["billing"];
  locale: PreparedSiteLocale;
  comparisonSelected: boolean;
  comparisonDisabled: boolean;
  evidenceOpen: boolean;
  onToggleComparison: () => void;
  onToggleEvidence: () => void;
}) {
  const diffPercent = getDiffPercent(region, referencePrice);
  const columns = showSourceColumn
    ? "md:grid-cols-[40px_minmax(120px,1fr)_104px_96px_110px_minmax(104px,1fr)_64px_124px]"
    : "md:grid-cols-[40px_minmax(130px,1fr)_110px_100px_112px_minmax(116px,1fr)_124px]";
  const taxDisplay = formatTaxDisplay(region, locale);
  const copy = getRegionPriceTableCopy(locale, getPlatform(region) === "web" ? "Web" : "App Store");
  const localizedCountry =
    getLocalizedRegionName(region.code, locale) || region.country;
  const billingSuffix = getBillingCycleSuffix(billingCycle, locale);
  const freshnessLabel = [
    region.lastCheckedAt
      ? `${copy.priceCollected} ${region.lastCheckedAt}`
      : "",
    region.fxRateDate ? `${copy.fxBasis} ${region.fxRateDate}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const desktopFreshnessDate = region.lastCheckedAt || region.fxRateDate;
  const decisionCopy = getRegionPriceDecisionCopy(locale);
  const evidencePanelId = useId();

  return (
    <>
      <article
        className="border-b border-zinc-100 px-4 py-4 last:border-b-0 md:hidden dark:border-zinc-800"
        aria-label={`${localizedCountry} · ${formatDisplayPrice(region.priceUsd)}`}
        data-region-price-row={region.code.toUpperCase()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800"
              aria-hidden="true"
            >
              <CountryFlag code={region.code} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                {localizedCountry}
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-zinc-400">
                #{rank} · {region.localPrice}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div
              className={`text-lg font-semibold tabular-nums ${getDiffTone(diffPercent)}`}
              data-region-price-converted
            >
              {formatDisplayPrice(region.priceUsd)}
              <span className="ml-0.5 text-xs font-normal text-zinc-400">
                {billingSuffix}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">
              {displayCurrency === "USD"
                ? copy.usdEquivalent
                : displayCurrencyLabel}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 border-y border-zinc-100 py-2.5 dark:border-zinc-800">
          <div>
            <div className="text-[11px] text-zinc-400">
              {hasUsReference ? copy.vsUs : referenceCountry}
            </div>
            <div className={`mt-1 text-sm font-semibold tabular-nums ${getDiffTone(diffPercent)}`}>
              {getDiffTextByLocale(diffPercent, locale, hasUsReference)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-zinc-400">{copy.source}</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {getRegionPlatformLabel(region)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="mb-1 text-[11px] text-zinc-400">{copy.taxNote}</div>
            <TaxTooltip region={region} taxDisplay={taxDisplay} locale={locale} />
          </div>
          <div className="min-w-0 text-right">
            <div className="mb-1 text-[11px] text-zinc-400">{copy.statusRisk}</div>
            <div className="flex justify-end">
              <SubscriptionConditions
                region={region}
                diffPercent={diffPercent}
                locale={locale}
              />
            </div>
          </div>
        </div>

        {freshnessLabel ? (
          <div className="mt-3 text-xs tabular-nums leading-5 text-zinc-400">
            {freshnessLabel}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <RegionComparisonToggle
            country={localizedCountry}
            selected={comparisonSelected}
            disabled={comparisonDisabled}
            locale={locale}
            onClick={onToggleComparison}
          />
          <button
            type="button"
            onClick={onToggleEvidence}
            aria-expanded={evidenceOpen}
            aria-controls={evidencePanelId}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {evidenceOpen ? decisionCopy.hideEvidence : decisionCopy.evidence}
            <ChevronDown
              aria-hidden="true"
              className={`h-3.5 w-3.5 transition-transform ${evidenceOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </article>

      <div
        className={[
          "hidden gap-2 border-b border-zinc-100 px-5 py-3 last:border-b-0 md:grid md:items-center md:px-6 dark:border-zinc-800",
          columns,
        ].join(" ")}
        data-region-price-row={region.code.toUpperCase()}
      >
        <div className="text-sm tabular-nums text-zinc-400">{rank}</div>

        <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800"
          aria-hidden="true"
        >
          <CountryFlag code={region.code} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">
            {localizedCountry}
          </div>
          <div className="mt-0.5 truncate text-xs text-zinc-400 md:hidden">
            {region.localPrice}
          </div>
        </div>
        </div>

        <div className="space-y-2">
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {copy.localPrice}
        </div>
        <div className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
          {region.localPrice}
        </div>
        </div>

        <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {displayCurrency === "USD" ? copy.usdEquivalent : displayCurrencyLabel}
        </div>
        <div
          className={`text-sm font-semibold tabular-nums ${getDiffTone(diffPercent)}`}
          data-region-price-converted
        >
          {formatDisplayPrice(region.priceUsd)}
          <span className="ml-0.5 text-xs font-normal text-zinc-400">
            {billingSuffix}
          </span>
        </div>
        {desktopFreshnessDate ? (
          <div
            className="mt-0.5 whitespace-nowrap text-[11px] tabular-nums text-zinc-400"
            title={freshnessLabel}
          >
            {desktopFreshnessDate}
          </div>
        ) : null}
        </div>

        <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">
          {hasUsReference ? copy.vsUs : referenceCountry}
        </div>
        <div className={`text-sm font-medium tabular-nums ${getDiffTone(diffPercent)}`}>
          {getDiffTextByLocale(diffPercent, locale, hasUsReference)}
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
          <SubscriptionConditions
            region={region}
            diffPercent={diffPercent}
            locale={locale}
          />
          <div className="flex items-center gap-1.5">
            <RegionComparisonToggle
              country={localizedCountry}
              selected={comparisonSelected}
              disabled={comparisonDisabled}
              locale={locale}
              onClick={onToggleComparison}
            />
            <button
              type="button"
              onClick={onToggleEvidence}
              aria-expanded={evidenceOpen}
              aria-controls={evidencePanelId}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white"
              title={evidenceOpen ? decisionCopy.hideEvidence : decisionCopy.evidence}
            >
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform ${evidenceOpen ? "rotate-180" : ""}`}
              />
              <span className="sr-only">
                {evidenceOpen ? decisionCopy.hideEvidence : decisionCopy.evidence}
              </span>
            </button>
          </div>
        </div>
      </div>

      {evidenceOpen ? (
        <RegionEvidencePanel
          region={region}
          referencePrice={referencePrice}
          hasUsReference={hasUsReference}
          displayCurrencyLabel={displayCurrencyLabel}
          formatDisplayPrice={formatDisplayPrice}
          locale={locale}
          panelId={evidencePanelId}
        />
      ) : null}
    </>
  );
}

export default function ExpandableRegionPriceTable(props: Props) {
  return props.variant === "r2" ? <R2RegionPriceTable {...props} /> : <ClassicRegionPriceTable {...props} />;
}

function R2RegionPriceTable({ plan, locale = "zh", displayCurrencyLabel = "USD", formatDisplayPrice = formatUsd, appearance }: Props) {
  const unified = appearance === "public";
  const MoreButton = unified ? PublicTextButton : "button";
  const en = locale === "en";
  const copy = getRegionPriceDecisionCopy(locale);
  const [query, setQuery] = useState("");
  const [relation, setRelation] = useState<PriceRelation>("all");
  const [descending, setDescending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>();
  const desktop = useDesktopLayout();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const compareRef = useRef<HTMLButtonElement>(null);
  const [comparing, setComparing] = useState(false);
  const [regionNotice, setRegionNotice] = useState("");
  const [opened, setOpened] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);
  const baseline = plan.regions.find(r => r.code.toUpperCase() === "US")?.priceUsd;
  const regions = plan.regions.filter(r => matchesRelation(r, baseline, relation)
    && `${getLocalizedRegionName(r.code, locale)} ${r.country} ${r.code}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => descending ? b.priceUsd - a.priceUsd : a.priceUsd - b.priceUsd);
  const isPreview = visibleCount === 5 && relation === "all" && !query.trim();
  const visibleRegions = isPreview ? pricePreview(regions) : regions.slice(0, visibleCount);
  const selectedRegions = selected.map(key => plan.regions.find(r => getRegionComparisonKey(r) === key)).filter((r): r is RegionPrice => Boolean(r));
  const labels: Record<PriceRelation, string> = {
    all: en ? "All" : "全部", lower: en ? "Below US" : "低于美国", same: en ? "Same as US" : "与美国相同", higher: en ? "Above US" : "高于美国",
  };
  const name = (r: RegionPrice) => getLocalizedRegionName(r.code, locale) || r.country;
  const diff = (r: RegionPrice) => {
    const value = priceDifference(r.priceUsd, baseline);
    return value === null ? (en ? "US unavailable" : "美国基准缺失") : r.code === "US" ? (en ? "Baseline" : "基准") : `${value > 0 ? "+" : ""}${value}%`;
  };
  function closeComparison() {
    dialogRef.current?.close();
    setComparing(false);
    compareRef.current?.focus();
  }
  useEffect(() => {
    if (!comparing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [comparing]);
  const toggle = (r: RegionPrice) => setSelected(current => toggleRegionComparison(current, getRegionComparisonKey(r)));
  useEffect(() => {
    function showRegion(event: Event) {
      const detail = (event as CustomEvent<{ planSlug: string; code: string }>).detail;
      if (detail?.planSlug !== plan.slug) return;
      const region = plan.regions.find(r => r.code === detail.code);
      if (!region) return;
      setQuery(""); setRelation("all"); setVisibleCount(plan.regions.length);
      const key = getRegionComparisonKey(region);
      setExpanded(key);
      if (unified) {
        setOpened(current => current.includes(key) ? current : [...current,key]);
        setHighlighted(region.code);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        const duration = Number.parseFloat(getComputedStyle(document.querySelector("[data-gs-plan-motion]") || document.documentElement).getPropertyValue("--gs-motion-highlight")) || 0;
        highlightTimer.current = setTimeout(() => setHighlighted(null), duration);
      }
      const country = getLocalizedRegionName(region.code, locale) || region.country;
      setRegionNotice(locale === "en" ? `Showing all regions and opening evidence for ${country}.` : `已显示全部地区，并定位到${country}的价格证据。`);
      requestAnimationFrame(() => {
        const button = document.querySelector<HTMLButtonElement>(`[data-region-price-row="${region.code}"] .gs-r2-row-button`);
        button?.scrollIntoView({ block: "center", ...(unified ? { behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" as const : "smooth" as const } : {}) }); button?.focus({ preventScroll: true });
      });
    }
    window.addEventListener("geosub:price-region", showRegion);
    function showLinkedRegion() {
      if (!unified) return;
      const code = window.location.hash.match(/^#region-([A-Z]{2})$/)?.[1];
      if (code) showRegion(new CustomEvent("geosub:price-region", { detail: { planSlug: plan.slug, code } }));
    }
    window.addEventListener("hashchange", showLinkedRegion);
    showLinkedRegion();
    return () => { window.removeEventListener("geosub:price-region", showRegion); window.removeEventListener("hashchange", showLinkedRegion); };
  }, [plan, locale, unified]);

  return (
    <section className="gs-r2-table" data-uniform-review={unified ? "" : undefined} aria-label={en ? "Region prices" : "地区价格"}>
      <div className="gs-r2-table-toolbar">
        <h2>{en ? "Region prices" : "地区价格"}</h2>
        {unified ? <PublicFilters animated className="gs-unified-filters" items={(Object.keys(labels) as PriceRelation[]).map(key => ({value:key,label:`${labels[key]} ${plan.regions.filter(r => matchesRelation(r, baseline, key)).length}`,disabled:key !== "all" && baseline === undefined}))} value={relation} onChange={value => {setRelation(value as PriceRelation);setVisibleCount(5);setRegionNotice("");}} /> : <div className="gs-r2-filters" aria-label={en ? "Price filters" : "价格筛选"}>
          {(Object.keys(labels) as PriceRelation[]).map(key => <button key={key} type="button" aria-pressed={relation === key}
            disabled={key !== "all" && baseline === undefined} onClick={() => { setRelation(key); setVisibleCount(5); setRegionNotice(""); }}>
            {labels[key]} <span>{plan.regions.filter(r => matchesRelation(r, baseline, key)).length}</span>
          </button>)}
        </div>}
        {unified ? <PublicInput label="查找地区" hideLabel startIcon={<Search aria-hidden="true" />} type="search" value={query} placeholder="搜索地区" onChange={e => {setQuery(e.target.value);setVisibleCount(5);setRegionNotice("");}} /> : <label className="gs-r2-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{en ? "Find a region" : "查找地区"}</span>
          <input type="search" value={query} placeholder={en ? "Search regions" : "搜索地区"} onChange={e => { setQuery(e.target.value); setVisibleCount(5); setRegionNotice(""); }} /></label>}
        {unified ? <PublicSelect label="价格排序" hideLabel value={descending ? "desc" : "asc"} onChange={value => setDescending(value === "desc")} options={[{value:"asc",label:"价格从低到高"},{value:"desc",label:"价格从高到低"}]} /> : <label><span className="sr-only">{en ? "Price order" : "价格排序"}</span><select value={descending ? "desc" : "asc"} onChange={e => setDescending(e.target.value === "desc")}>
          <option value="asc">{en ? "Price: low to high" : "价格从低到高"}</option><option value="desc">{en ? "Price: high to low" : "价格从高到低"}</option>
        </select></label>}
      </div>
      {regionNotice && <p role="status" className="gs-r2-region-notice">{regionNotice}</p>}
      <div className="gs-r2-table-head" aria-hidden="true"><span /><span>{en ? "Region" : "地区"}</span><span>{`${en ? "Converted" : "折算价"} ${getBillingCycleSuffix(plan.billing,locale).replace("/", "/ ")}`}</span><span>{`${en ? "Local" : "当地标价"} ${getBillingCycleSuffix(plan.billing,locale).replace("/", "/ ")}`}</span><span>{en ? "vs US" : "较美国"}</span><span>{en ? "Tax" : "税费"}</span><span>{en ? "Collected" : "价格日期"}</span><span>{en ? "FX date" : "汇率日期"}</span>{!unified && <span>{en ? "Review" : "复核状态"}</span>}<span /></div>
      <div aria-live="polite" className="sr-only">{en ? `${regions.length} regions` : `${regions.length} 个地区`}</div>
      <PlanRows animated={unified} changeKey={`${relation}-${query}-${descending}`}>
      {visibleRegions.map(r => {
        const key = getRegionComparisonKey(r);
        const isSelected = selected.includes(key);
        const isExpanded = (expanded === undefined && desktop && visibleRegions[0] ? getRegionComparisonKey(visibleRegions[0]) : expanded) === key;
        const panelId = `r2-evidence-${r.code}-${r.billingPlatform || "unknown"}`;
        return <div key={key} className="gs-r2-record" data-map-highlight={unified && highlighted === r.code ? "" : undefined} data-region-price-row={r.code}>
          <div className="gs-r2-price-row">
            {unified ? <PublicCheckbox animated className="gs-unified-checkbox" label={isSelected ? copy.removeRegion(name(r)) : copy.selectRegion(name(r))} hideLabel checked={isSelected} disabled={!isSelected && selected.length >= REGION_COMPARISON_LIMIT} onChange={() => toggle(r)} /> : <label className="gs-r2-checkbox"><input type="checkbox" checked={isSelected} disabled={!isSelected && selected.length >= REGION_COMPARISON_LIMIT}
              aria-label={isSelected ? copy.removeRegion(name(r)) : copy.selectRegion(name(r))} onChange={() => toggle(r)} /></label>}
            <button type="button" className="gs-r2-row-button" onClick={() => { if (unified) setOpened(current => current.includes(key) ? current : [...current,key]); setExpanded(isExpanded ? null : key); }} aria-expanded={isExpanded} aria-controls={unified ? `${panelId}-region` : panelId}>
              <span className="gs-r2-region"><CountryFlag code={r.code} /><strong>{name(r)}</strong></span>
              <strong className="gs-r2-row-price" data-region-price-converted>{formatDisplayPrice(r.priceUsd)}</strong>
              <span className="gs-r2-local">{r.localPrice}<span className="gs-r2-inline-tax"> · {taxSummary(r, en)}</span></span>
              <span data-us-reference={unified && r.code === "US" ? "" : undefined} className={`gs-r2-diff ${(priceDifference(r.priceUsd, baseline) || 0) < 0 ? "gs-price-low" : (priceDifference(r.priceUsd, baseline) || 0) > 0 ? "gs-price-high" : ""}`}>{diff(r)}</span>
              <span className="gs-r2-tax">{taxSummary(r, en)}</span>
              <time className="gs-r2-dates" dateTime={r.lastCheckedAt} title={r.lastCheckedAt}>{r.lastCheckedAt?.slice(5) || "—"}</time>
              <time className="gs-r2-dates" dateTime={r.fxRateDate} title={r.fxRateDate}>{r.fxRateDate?.slice(5) || "—"}</time>
              {!unified && <span className="gs-r2-review" title={r.reviewedAt || (en ? "No independently confirmed review" : "尚无独立确认的复核状态")}>{en ? "Unconfirmed" : "待确认"}</span>}
              <ChevronDown size={16} className={unified ? "gs-r2-row-chevron" : isExpanded ? "rotate-180" : ""} aria-hidden="true" />
              <span className="sr-only">{isExpanded ? copy.hideEvidence : copy.evidence}</span>
            </button>
          </div>
          {unified ? <div id={`${panelId}-region`} className="gs-r2-evidence" data-open={isExpanded} aria-hidden={!isExpanded} inert={!isExpanded}><div className="gs-r2-evidence-inner">{(isExpanded || opened.includes(key)) && <RegionEvidencePanel compact animated region={r} referencePrice={baseline || 0} hasUsReference={baseline !== undefined}
            displayCurrencyLabel={displayCurrencyLabel} formatDisplayPrice={formatDisplayPrice} locale={locale} panelId={panelId} />}</div></div> : <>          {isExpanded && <div className="gs-r2-evidence"><RegionEvidencePanel compact region={r} referencePrice={baseline || 0} hasUsReference={baseline !== undefined}
            displayCurrencyLabel={displayCurrencyLabel} formatDisplayPrice={formatDisplayPrice} locale={locale} panelId={panelId} /></div>}</>}

        </div>;
      })}
      </PlanRows>
      {regions.length === 0 && <div className="gs-r2-empty">{en ? "No matching publishable prices. Clear the search or change the filter." : "暂无符合条件的可发布价格。请清空搜索或切换筛选。"}</div>}
      {regions.length > visibleCount && <MoreButton type="button" className="gs-r2-more" onClick={() => setVisibleCount(count => count === 5 ? 20 : count + 20)}>{isPreview ? (en ? `Show all ${regions.length} regions` : `显示全部 ${regions.length} 个地区`) : (en ? `Show more · ${regions.length - visibleCount} remaining` : `继续显示 · 剩余 ${regions.length - visibleCount} 个地区`)}<ChevronDown size={16} /></MoreButton>}
      {isPreview && regions.length > 5 && <p className="gs-r2-preview-note">{en ? (baseline === undefined ? "Preview includes the highest price; US unavailable." : "Preview includes the US baseline and highest price.") : (baseline === undefined ? "预览包含最高价；暂无美国基准。" : "预览包含美国基准与最高价。")}</p>}
      {(unified || selectedRegions.length > 0) && <aside className="gs-r2-compare-bar" data-active={unified ? selectedRegions.length > 0 : undefined} aria-hidden={unified && selectedRegions.length === 0 ? true : undefined} inert={unified && selectedRegions.length === 0 ? true : undefined} aria-label={copy.comparisonTitle}>
        <span role="status">{copy.selected(selectedRegions.length)}{selectedRegions.length === REGION_COMPARISON_LIMIT ? (en ? " · Limit reached" : " · 已满额") : ""}</span>
        <div className="gs-r2-selected">{selectedRegions.map(r => unified ? <PublicButton key={getRegionComparisonKey(r)} variant="secondary" onClick={() => toggle(r)} aria-label={copy.removeRegion(name(r))}>{name(r)}<X size={14} /></PublicButton> : <button key={getRegionComparisonKey(r)} type="button" onClick={() => toggle(r)} aria-label={copy.removeRegion(name(r))}>{name(r)}<X size={14} /></button>)}</div>
        {unified ? <PublicButton ref={compareRef} disabled={selectedRegions.length < 2} onClick={() => {dialogRef.current?.showModal();setComparing(true);}}>开始比较</PublicButton> : <button type="button" className="gs-primary" ref={compareRef} disabled={selectedRegions.length < 2} onClick={() => { dialogRef.current?.showModal(); setComparing(true); }}>{en ? "Compare" : "开始比较"}</button>}
        {unified ? <PublicTextButton onClick={() => setSelected([])}>{copy.clearComparison}</PublicTextButton> : <button type="button" onClick={() => setSelected([])}>{copy.clearComparison}</button>}
      </aside>}
      <dialog ref={dialogRef} className="gs-r2-dialog" aria-label={copy.comparisonTitle} onCancel={e => { e.preventDefault(); closeComparison(); }} onClick={e => { if (e.target === e.currentTarget) closeComparison(); }}>
        <div className="gs-r2-dialog-content"><div className="gs-r2-dialog-title"><h2>{copy.comparisonTitle}</h2>{unified ? <PublicIconButton onClick={closeComparison} aria-label="关闭比较" autoFocus><X aria-hidden="true" /></PublicIconButton> : <button type="button" onClick={closeComparison} aria-label={en ? "Close comparison" : "关闭比较"} autoFocus><X size={20} /></button>}</div>
          <RegionComparisonPanel regions={selectedRegions} referencePrice={baseline || 0} hasUsReference={baseline !== undefined} displayCurrencyLabel={displayCurrencyLabel} formatDisplayPrice={formatDisplayPrice} locale={locale}
            onRemove={r => { if (selectedRegions.length <= 2) closeComparison(); toggle(r); }} onClear={() => { closeComparison(); setSelected([]); }} />
        </div>
      </dialog>
    </section>
  );
}

function ClassicRegionPriceTable({
  plan,
  initialVisibleCount = 8,
  locale = "zh",
  platformLabel,
  displayCurrency = "USD",
  displayCurrencyLabel,
  formatDisplayPrice = formatUsd,
  toolbarCurrencyControl,
  showPlatformFilter = true,
  showSourceColumn = false,
}: Props) {
  const [platform, setPlatform] = useState<PlatformFilter>(() =>
    getDefaultPlatform(plan.regions),
  );
  const [regionQuery, setRegionQuery] = useState("");
  const [quickFilter, setQuickFilter] =
    useState<RegionPriceQuickFilter>("all");
  const [selectedRegionKeys, setSelectedRegionKeys] = useState<string[]>([]);
  const [expandedRegionKey, setExpandedRegionKey] = useState<string | null>(null);

  const platformCounts = useMemo(() => {
    return plan.regions.reduce<Record<string, number>>((counts, region) => {
      const key = getPlatform(region);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [plan.regions]);

  const effectivePlatform = showPlatformFilter ? platform : "all";

  const platformRegions = useMemo(() => {
    if (effectivePlatform === "all") return getSortedRegions(plan.regions);

    return getSortedRegions(
      plan.regions.filter((region) => getPlatform(region) === effectivePlatform),
    );
  }, [plan.regions, effectivePlatform]);

  const referenceRegion = getReferenceRegion(platformRegions);
  const referencePrice = referenceRegion?.priceUsd || 0;
  const filteredRegions = getSortedRegions(
    filterRegionPrices({
      regions: platformRegions,
      query: regionQuery,
      filter: quickFilter,
      referencePrice,
      locale,
    }),
  );
  const quickFilterCounts = Object.fromEntries(
    quickFilterOptions.map((filter) => [
      filter,
      filterRegionPrices({
        regions: platformRegions,
        query: regionQuery,
        filter,
        referencePrice,
        locale,
      }).length,
    ]),
  ) as Record<RegionPriceQuickFilter, number>;
  const hasUsReference = referenceRegion?.code.toUpperCase() === "US";
  const referenceCountry = referenceRegion
    ? getLocalizedRegionName(referenceRegion.code, locale) || referenceRegion.country
    : "";
  const copy = getRegionPriceTableCopy(locale,
    platformRegions.length > 0 && platformRegions.every(region => getPlatform(region) === "web") ? "Web" : "App Store");
  const toolbarCopy = getRegionPriceToolbarCopy(locale);
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
    displayCurrency === "USD" ? copy.usdEquivalent : effectiveDisplayCurrencyLabel;
  const sortCurrencyLabel =
    displayCurrency === "USD" ? copy.usdSort : effectiveDisplayCurrencyLabel;
  const selectedRegions = selectedRegionKeys
    .map((key) =>
      platformRegions.find((region) => getRegionComparisonKey(region) === key),
    )
    .filter((region): region is RegionPrice => Boolean(region));

  const handleToggleComparison = (region: RegionPrice) => {
    const regionKey = getRegionComparisonKey(region);
    setSelectedRegionKeys((current) =>
      toggleRegionComparison(current, regionKey),
    );
  };

  const renderRegionRow = (region: RegionPrice, rank: number) => {
    const regionKey = getRegionComparisonKey(region);
    const comparisonSelected = selectedRegionKeys.includes(regionKey);
    const comparisonDisabled =
      !comparisonSelected && selectedRegionKeys.length >= REGION_COMPARISON_LIMIT;

    return (
      <RegionPriceRow
        key={`${plan.slug}-${regionKey}`}
        region={region}
        rank={rank}
        referencePrice={referencePrice}
        referenceCountry={referenceCountry}
        hasUsReference={hasUsReference}
        displayCurrency={displayCurrency}
        displayCurrencyLabel={effectiveDisplayCurrencyLabel}
        formatDisplayPrice={formatDisplayPrice}
        showSourceColumn={shouldShowSourceColumn}
        billingCycle={plan.billing}
        locale={locale}
        comparisonSelected={comparisonSelected}
        comparisonDisabled={comparisonDisabled}
        evidenceOpen={expandedRegionKey === regionKey}
        onToggleComparison={() => handleToggleComparison(region)}
        onToggleEvidence={() =>
          setExpandedRegionKey((current) =>
            current === regionKey ? null : regionKey,
          )
        }
      />
    );
  };

  const renderRegionSummaryRow = (region: RegionPrice, rank: number) => {
    const localizedCountry =
      getLocalizedRegionName(region.code, locale) || region.country;
    const billingSuffix = getBillingCycleSuffix(plan.billing, locale);
    const diffPercent = getDiffPercent(region, referencePrice);

    return (
      <div
        key={`${plan.slug}-summary-${getRegionComparisonKey(region)}`}
        className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 md:grid-cols-[44px_minmax(160px,1fr)_140px_130px] md:px-6 dark:border-zinc-800"
        aria-label={`${localizedCountry} · ${region.localPrice} · ${formatDisplayPrice(region.priceUsd)}`}
        data-region-price-row={region.code.toUpperCase()}
      >
        <span className="text-sm tabular-nums text-zinc-400">#{rank}</span>
        <span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
          {localizedCountry}
        </span>
        <span className="hidden text-sm tabular-nums text-zinc-600 md:block dark:text-zinc-300">
          {region.localPrice}
        </span>
        <span
          className={`text-right text-sm font-semibold tabular-nums ${getDiffTone(diffPercent)}`}
          data-region-price-converted
        >
          {formatDisplayPrice(region.priceUsd)}
          <span className="ms-1 text-xs font-normal text-zinc-400">{billingSuffix}</span>
          <span className="mt-0.5 block text-xs font-normal text-zinc-400 md:hidden">
            {region.localPrice}
          </span>
        </span>
      </div>
    );
  };

  const visibleRegions = filteredRegions.slice(0, initialVisibleCount);
  const hiddenRegions = filteredRegions.slice(initialVisibleCount);
  const headerColumns = shouldShowSourceColumn
    ? "md:grid-cols-[40px_minmax(120px,1fr)_104px_96px_110px_minmax(104px,1fr)_64px_124px]"
    : "md:grid-cols-[40px_minmax(130px,1fr)_110px_100px_112px_minmax(116px,1fr)_124px]";

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow={copy.eyebrow}
        title={copy.title(plan.name)}
        description={copy.description(activePlatformLabel, sortCurrencyLabel)}
        actions={
          <div className="text-xs text-zinc-400">
            {copy.regionCount(platformRegions.length)}
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
                  onClick={() => {
                    setPlatform(option.value);
                    setSelectedRegionKeys([]);
                    setExpandedRegionKey(null);
                  }}
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

      <div
        className="sticky top-16 z-30 border-b border-zinc-200 bg-white/95 px-4 py-2.5 shadow-[0_6px_18px_rgba(24,24,27,0.06)] backdrop-blur-xl md:px-6 dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-black/20"
        aria-label={toolbarCopy.toolbarLabel}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {toolbarCurrencyControl ? (
            <div className="shrink-0">{toolbarCurrencyControl}</div>
          ) : null}

          <label className="relative min-w-[150px] flex-1 md:max-w-[280px]">
            <span className="sr-only">{toolbarCopy.searchLabel}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              strokeWidth={2}
            />
            <input
              type="search"
              value={regionQuery}
              onChange={(event) => setRegionQuery(event.target.value)}
              placeholder={toolbarCopy.searchPlaceholder}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 ps-9 pe-9 text-[13px] font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-lime-400 focus:bg-white focus:ring-4 focus:ring-lime-500/10 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-white dark:focus:border-lime-500/60 dark:focus:bg-zinc-950"
            />
            {regionQuery ? (
              <button
                type="button"
                onClick={() => setRegionQuery("")}
                className="absolute end-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={toolbarCopy.clearSearch}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            ) : null}
          </label>

          <div
            className="order-last flex min-w-0 basis-full items-center gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:order-none md:basis-auto md:flex-initial dark:bg-zinc-950/70"
            role="group"
            aria-label={toolbarCopy.filtersLabel}
          >
            {quickFilterOptions.map((filter) => {
              const active = quickFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuickFilter(filter)}
                  className={[
                    "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                      : "text-zinc-500 hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <span>{toolbarCopy.filterLabels[filter]}</span>
                  <span
                    className={[
                      "tabular-nums",
                      active ? "text-white/65 dark:text-zinc-500" : "text-zinc-400",
                    ].join(" ")}
                  >
                    {quickFilterCounts[filter]}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="ms-auto hidden shrink-0 text-xs font-semibold tabular-nums text-zinc-500 md:block dark:text-zinc-400"
            aria-live="polite"
          >
            {toolbarCopy.resultCount(filteredRegions.length, platformRegions.length)}
          </div>
          <div className="sr-only md:hidden" aria-live="polite">
            {toolbarCopy.resultCount(filteredRegions.length, platformRegions.length)}
          </div>
        </div>
      </div>

      {selectedRegions.length > 0 ? (
        <RegionComparisonPanel
          regions={selectedRegions}
          referencePrice={referencePrice}
          hasUsReference={hasUsReference}
          displayCurrencyLabel={effectiveDisplayCurrencyLabel}
          formatDisplayPrice={formatDisplayPrice}
          locale={locale}
          onRemove={handleToggleComparison}
          onClear={() => setSelectedRegionKeys([])}
        />
      ) : null}

      <div className="overflow-hidden">
        <div
          className={[
            "hidden gap-2 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40",
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
            label={hasUsReference ? copy.vsUs : referenceCountry}
            help={hasUsReference ? copy.vsUsHelp : referenceCountry}
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
          />
        </div>

        {filteredRegions.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">
            {regionQuery.trim() || quickFilter !== "all"
              ? toolbarCopy.noMatches
              : copy.empty(activePlatformLabel)}
          </div>
        ) : (
          <>
            <div>
              {visibleRegions.map((region, index) =>
                renderRegionRow(region, index + 1),
              )}
            </div>

            <AppleStyleExpandableRows
              key={`${plan.slug}-${effectivePlatform}-${displayCurrency}-${regionQuery}-${quickFilter}`}
              hiddenCount={hiddenRegions.length}
              showLabel={copy.showMore(hiddenRegions.length)}
              hideLabel={copy.collapse}
              renderChildren={() => hiddenRegions.map((region, index) =>
                renderRegionSummaryRow(region, initialVisibleCount + index + 1),
              )}
            />
          </>
        )}
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 text-xs leading-5 text-zinc-500 md:px-6 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        {copy.riskNote}
      </div>
    </PublicSection>
  );
}

function PlanRows({ animated, changeKey, children }: { animated: boolean; changeKey: string; children: ReactNode }) {
  return animated ? <div className="gs-r2-row-list" key={changeKey}>{children}</div> : <>{children}</>;
}
