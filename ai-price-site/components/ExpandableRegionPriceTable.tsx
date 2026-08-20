"use client";

import Image from "next/image";
import { Check, ChevronDown, ExternalLink, Plus, Scale, Search, X } from "lucide-react";
import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { formatUsd } from "../lib/public-pricing-model";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getLocalizedRegionName } from "../lib/locale-format";
import { getRegionPriceTableCopy } from "../lib/region-price-table-copy";
import type { PreparedSiteLocale } from "../lib/site-locale";
import { localizeTaxNote } from "../lib/tax-note-localization";
import { getBillingCycleSuffix } from "../lib/billing-cycle-label";
import {
  assessSubscriptionAccess,
  getSubscriptionAccessCopy,
  type SubscriptionAccessEvidence,
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
  if (diffPercent < -5) return "text-emerald-700 dark:text-emerald-300";
  if (diffPercent > 18) return "text-rose-600 dark:text-rose-300";
  if (diffPercent > 5) return "text-amber-700 dark:text-amber-300";
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
  if (diffPercent < -5) return "bg-emerald-500";
  if (diffPercent > 18) return "bg-rose-500";
  if (diffPercent > 5) return "bg-amber-500";
  return "bg-zinc-300";
}

function getAccessEvidenceClass(evidence: SubscriptionAccessEvidence) {
  if (evidence === "confirmed") {
    return "text-emerald-700 dark:text-emerald-300";
  }

  if (evidence === "conditional") {
    return "text-amber-700 dark:text-amber-300";
  }

  return "text-zinc-500 dark:text-zinc-400";
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
  const copy = getRegionPriceTableCopy(locale);

  if (!raw && (region.taxReviewStatus === "needs_review" || region.taxConfidence === "low")) {
    return copy.taxNeedsReview;
  }

  return raw
    ? localizeTaxNote(raw, locale, {
        unknownFallback: locale !== "zh" && locale !== "en",
      })
    : copy.checkoutApplies;
}

function getTaxTooltip(
  region: RegionPrice,
  locale: PreparedSiteLocale,
) {
  const copy = getRegionPriceTableCopy(locale);
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
    note,
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

function CountryFlag({ code }: { code: string }) {
  const countryCode = code.toUpperCase();
  const isIso2 = /^[A-Z]{2}$/.test(countryCode);
  const [imageFailed, setImageFailed] = useState(false);

  if (isIso2 && !imageFailed) {
    return (
      <Image
        src={`/flags/${countryCode.toLowerCase()}.svg`}
        alt=""
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
  const accessLabel = accessCopy.conclusion[assessment.conclusion];

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
        aria-label={`${statusLabel} · ${accessLabel}`}
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen(true)}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDot(diffPercent)}`} />
        <span className="shrink-0">{statusLabel}</span>
        <span
          className={[
            "hidden h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-semibold ring-1 ring-inset xl:inline-flex",
            assessment.conclusion === "restrictions"
              ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800"
              : "bg-zinc-50 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800",
          ].join(" ")}
        >
          {accessLabel}
        </span>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={[
          "pointer-events-none absolute right-0 top-full z-[90] mt-2 w-[min(340px,calc(100vw-32px))] rounded-lg border border-zinc-200/80 bg-white/95 p-3 text-left text-xs leading-5 text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur transition duration-150 ease-out dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:text-zinc-300",
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        ].join(" ")}
      >
        <span className="mb-1.5 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(diffPercent)}`} />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {statusLabel} · {accessLabel}
          </span>
        </span>
        <span className="grid gap-1.5">
          {assessment.facts.map((fact) => {
            const evidenceLabel =
              fact.key === "checked" &&
              fact.evidence === "confirmed" &&
              region.lastCheckedAt
                ? accessCopy.checkedValue(region.lastCheckedAt)
                : accessCopy.evidence[fact.evidence];

            return (
              <span
                key={fact.key}
                className="flex items-start justify-between gap-4 border-t border-zinc-100 pt-1.5 first:border-t-0 first:pt-0 dark:border-zinc-800"
              >
                <span>{accessCopy.facts[fact.key]}</span>
                <span
                  className={`shrink-0 font-semibold ${getAccessEvidenceClass(fact.evidence)}`}
                >
                  {evidenceLabel}
                </span>
              </span>
            );
          })}
        </span>
      </span>
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

function RegionEvidencePanel({
  region,
  referencePrice,
  hasUsReference,
  displayCurrencyLabel,
  formatDisplayPrice,
  locale,
  panelId,
}: {
  region: RegionPrice;
  referencePrice: number;
  hasUsReference: boolean;
  displayCurrencyLabel: string;
  formatDisplayPrice: (value: number) => string;
  locale: PreparedSiteLocale;
  panelId: string;
}) {
  const decisionCopy = getRegionPriceDecisionCopy(locale);
  const accessCopy = getSubscriptionAccessCopy(locale);
  const tableCopy = getRegionPriceTableCopy(locale);
  const assessment = assessSubscriptionAccess(region);
  const localizedCountry =
    getLocalizedRegionName(region.code, locale) || region.country;
  const diffPercent = getDiffPercent(region, referencePrice);
  const taxDisplay = formatTaxDisplay(region, locale);

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
            getDiffTextByLocale(diffPercent, locale, hasUsReference),
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

      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <div className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {decisionCopy.accessConditions}
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {assessment.facts.map((fact) => {
            const evidenceLabel =
              fact.key === "checked" &&
              fact.evidence === "confirmed" &&
              region.lastCheckedAt
                ? accessCopy.checkedValue(region.lastCheckedAt)
                : accessCopy.evidence[fact.evidence];

            return (
              <div key={fact.key} className="flex items-start justify-between gap-3 text-xs leading-5">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {accessCopy.facts[fact.key]}
                </span>
                <span className={`shrink-0 font-semibold ${getAccessEvidenceClass(fact.evidence)}`}>
                  {evidenceLabel}
                </span>
              </div>
            );
          })}
        </div>
        {!region.sourceUrl ? (
          <div className="mt-3 text-xs text-zinc-400">
            {decisionCopy.sourceUnavailable} · {tableCopy.riskNote}
          </div>
        ) : null}
      </div>
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
                  {getDiffTextByLocale(diffPercent, locale, hasUsReference)}
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
    ? "md:grid-cols-[44px_minmax(142px,1.05fr)_120px_108px_124px_minmax(136px,1fr)_82px_118px]"
    : "md:grid-cols-[44px_minmax(150px,1.05fr)_122px_108px_124px_minmax(144px,1fr)_118px]";
  const taxDisplay = formatTaxDisplay(region, locale);
  const copy = getRegionPriceTableCopy(locale);
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
  const decisionCopy = getRegionPriceDecisionCopy(locale);
  const evidencePanelId = useId();

  return (
    <>
      <article
        className="border-b border-zinc-100 px-4 py-4 last:border-b-0 md:hidden dark:border-zinc-800"
        aria-label={`${localizedCountry} · ${formatDisplayPrice(region.priceUsd)}`}
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
            <div className="text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">
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
          "hidden gap-3 border-b border-zinc-100 px-5 py-3 last:border-b-0 md:grid md:items-center md:px-6 dark:border-zinc-800",
          columns,
        ].join(" ")}
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
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatDisplayPrice(region.priceUsd)}
          <span className="ml-0.5 text-xs font-normal text-zinc-400">
            {billingSuffix}
          </span>
        </div>
        {displayCurrency !== "USD" ? (
          <div className="mt-0.5 text-xs text-zinc-400">{displayCurrencyLabel}</div>
        ) : null}
        {freshnessLabel ? (
          <div className="mt-0.5 text-xs tabular-nums text-zinc-400">
            {freshnessLabel}
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

export default function ExpandableRegionPriceTable({
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
  const copy = getRegionPriceTableCopy(locale);
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
            className="pl-4"
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
            >
              {hiddenRegions.map((region, index) =>
                renderRegionRow(region, initialVisibleCount + index + 1),
              )}
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
