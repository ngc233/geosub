"use client";

import { useMemo, useState } from "react";
import type {
  PlanAffordabilityRow,
  PlanAffordabilitySummary,
} from "../lib/affordability";
import type { SiteLocale } from "../lib/site-locale";
import ExpandableAffordabilityRows from "./ExpandableAffordabilityRows";
import {
  DataNote,
  PublicSection,
  PublicSectionHeader,
} from "./ui/PublicPage";

type Props = {
  productName: string;
  planName: string;
  summary: PlanAffordabilitySummary | null;
  rows: PlanAffordabilityRow[];
  locale?: SiteLocale;
};

type SortMode = "pressure" | "accessible";

const affordabilityCopy = {
  zh: {
    times: "倍",
    sectionTitle: (productName: string) => `${productName} 本地购买力对比`,
    sectionDescription: (planName: string) =>
      `把 ${planName} 的月费与当地月均收入放在一起比较，判断同一笔订阅在不同地区实际有多重。`,
    highestBurden: "最难承受",
    lowestBurden: "最易承受",
    usBase: "美国基准",
    highestBurdenHelper: (share: string, times: string) =>
      `占月收入 ${share} · 美国的 ${times} 倍`,
    lowestBurdenHelper: (share: string, times: string) =>
      `占月收入 ${share} · 美国的 ${times} 倍`,
    usBaseHelper: (share: string) => `占月收入 ${share} · 记为 1.00 倍`,
    chartTitle: "本地订阅负担排行",
    chartDescription: "数值越高，代表这笔月费占当地收入越多。条形中的细线是美国 1.00 倍基准。",
    pressureFirst: "最难承受",
    accessibleFirst: "最易承受",
    rank: "排名",
    region: "地区",
    monthlyFee: "月费",
    burden: "本地负担",
    usBenchmark: "美国 1.00 倍",
    incomeShare: (share: string) => `占月收入 ${share}`,
    monthlyIncome: (income: string) => `月均收入约 ${income}`,
    priceCheaper: (value: number) => `比美国便宜 ${Math.abs(Math.round(value))}%`,
    priceHigher: (value: number) => `比美国贵 ${Math.abs(Math.round(value))}%`,
    priceSame: "与美国价格接近",
    relativeBurden: (value: string) => `美国的 ${value} 倍`,
    bands: {
      lighter: "比美国负担轻",
      similar: "接近美国",
      elevated: "负担偏重",
      heavy: "负担较重",
      severe: "负担很重",
    },
    methodLabel: "怎么算",
    method: "月费 ÷ 当地月均收入，再与美国同套餐的收入占比比较。这个指标用于比较相对压力，不代表个人实际收入或支付成功率。",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `收入指标采用 ${metric}${indicator ? `（${indicator}）` : ""}，收入数据年份为 ${year}，价格检查时间为 ${checked}。购买力结果用于解释地区价格压力，不等同于个人支付能力。`,
  },
  en: {
    times: "×",
    sectionTitle: (productName: string) => `${productName} local affordability`,
    sectionDescription: (planName: string) =>
      `Compares the ${planName} monthly fee with estimated local monthly income to show how heavy the same subscription may feel across regions.`,
    highestBurden: "Hardest to afford",
    lowestBurden: "Easiest to afford",
    usBase: "US benchmark",
    highestBurdenHelper: (share: string, times: string) =>
      `${share} of monthly income · ${times}× the US burden`,
    lowestBurdenHelper: (share: string, times: string) =>
      `${share} of monthly income · ${times}× the US burden`,
    usBaseHelper: (share: string) => `${share} of monthly income · defined as 1.00×`,
    chartTitle: "Local subscription burden ranking",
    chartDescription: "Higher values mean the fee consumes more local income. The thin marker in each bar is the US 1.00× benchmark.",
    pressureFirst: "Hardest to afford",
    accessibleFirst: "Easiest to afford",
    rank: "Rank",
    region: "Region",
    monthlyFee: "Monthly fee",
    burden: "Local burden",
    usBenchmark: "US 1.00×",
    incomeShare: (share: string) => `${share} of monthly income`,
    monthlyIncome: (income: string) => `Estimated monthly income ${income}`,
    priceCheaper: (value: number) => `${Math.abs(Math.round(value))}% cheaper than US`,
    priceHigher: (value: number) => `${Math.abs(Math.round(value))}% higher than US`,
    priceSame: "Close to the US price",
    relativeBurden: (value: string) => `${value}× the US burden`,
    bands: {
      lighter: "Lighter than US",
      similar: "Close to US",
      elevated: "Elevated burden",
      heavy: "Heavy burden",
      severe: "Very heavy burden",
    },
    methodLabel: "Method",
    method: "Monthly fee divided by estimated local monthly income, then compared with the income share for the same plan in the US. This shows relative pressure, not personal income or payment success.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `Income metric: ${metric}${indicator ? ` (${indicator})` : ""}. Income data year: ${year}. Price checked: ${checked}. Affordability results explain regional price pressure; they do not represent an individual's ability to pay.`,
  },
} satisfies Record<SiteLocale, object>;

function getAffordabilityCopy(locale: SiteLocale) {
  return affordabilityCopy[locale];
}

const localeMap: Record<SiteLocale, string> = {
  zh: "zh-CN",
  en: "en",
};

function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

function formatUsd(value: number, digits = 2) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function metricLabel(metricType?: string | null) {
  const map: Record<string, string> = {
    GNI_PPP: "GNI per capita, PPP",
    GNI_ATLAS: "GNI per capita, Atlas method",
    GDP_NOMINAL: "GDP per capita, current US$",
  };

  return metricType ? map[metricType] || metricType : "-";
}

function getCountryName(row: PlanAffordabilityRow | null | undefined, locale: SiteLocale) {
  if (!row) return "-";

  try {
    const displayNames = new Intl.DisplayNames([localeMap[locale] || "en"], {
      type: "region",
    });
    const localizedName = displayNames.of(row.countryCode.toUpperCase());
    if (localizedName) return localizedName;
  } catch {
    // Fall back to stored names.
  }

  if (locale === "zh") {
    return row.countryNameZh || row.countryNameEn || row.countryCode;
  }

  return row.countryNameEn || row.countryNameZh || row.countryCode;
}

function getBurdenTone(value: number) {
  if (value > 4) {
    return {
      bar: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-300",
      badge: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800",
      band: "severe" as const,
    };
  }

  if (value > 2) {
    return {
      bar: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-300",
      badge: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-800",
      band: "heavy" as const,
    };
  }

  if (value > 1.2) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
      band: "elevated" as const,
    };
  }

  if (value >= 0.8) {
    return {
      bar: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800",
      band: "similar" as const,
    };
  }

  return {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    band: "lighter" as const,
  };
}

function getPriceComparison(row: PlanAffordabilityRow, locale: SiteLocale) {
  const copy = getAffordabilityCopy(locale);
  if (row.diffVsUsPercent < -1) return copy.priceCheaper(row.diffVsUsPercent);
  if (row.diffVsUsPercent > 1) return copy.priceHigher(row.diffVsUsPercent);
  return copy.priceSame;
}

function SummaryMetric({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "green" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "red"
        ? "text-rose-600 dark:text-rose-300"
        : "text-zinc-950 dark:text-white";

  return (
    <div className="min-w-0 px-3 py-4 md:px-5 md:py-5">
      <div className="truncate text-[11px] font-medium text-zinc-400 sm:text-xs">{label}</div>
      <div className={`mt-1 truncate text-base font-semibold md:text-lg ${valueClass}`}>{value}</div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-400 md:text-xs md:leading-5">
        {helper}
      </div>
    </div>
  );
}

function BurdenRow({
  row,
  rank,
  maxBurden,
  locale,
}: {
  row: PlanAffordabilityRow;
  rank: number;
  maxBurden: number;
  locale: SiteLocale;
}) {
  const copy = getAffordabilityCopy(locale);
  const tone = getBurdenTone(row.burdenVsUs);
  const barWidth = Math.max(3, Math.min(100, (row.burdenVsUs / maxBurden) * 100));
  const benchmarkPosition = Math.max(2, Math.min(98, (1 / maxBurden) * 100));
  const isUs = row.countryCode.toUpperCase() === "US";

  return (
    <div className="grid gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0 md:grid-cols-[52px_minmax(140px,0.8fr)_120px_minmax(280px,1.5fr)] md:items-center md:px-6 dark:border-zinc-800">
      <div className="text-sm tabular-nums text-zinc-400">#{rank}</div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
          {getCountryName(row, locale)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{row.countryCode}</div>
      </div>

      <div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatUsd(row.priceUsd)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {getPriceComparison(row, locale)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className={`text-base font-semibold tabular-nums ${tone.text}`}>
              {row.burdenVsUs.toFixed(2)}{copy.times}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.incomeShare(formatPercent(row.incomeSharePercent))}
            </span>
          </div>
          <span className={["inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tone.badge].join(" ")}>
            {isUs ? copy.usBenchmark : copy.bands[tone.band]}
          </span>
        </div>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${barWidth}%` }} />
          <span
            className="absolute inset-y-0 w-px bg-zinc-950/70 dark:bg-white/80"
            style={{ left: `${benchmarkPosition}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <span>{copy.monthlyIncome(formatUsd(row.monthlyIncomeUsd, 0))}</span>
          <span>{copy.relativeBurden(row.burdenVsUs.toFixed(2))}</span>
        </div>
      </div>
    </div>
  );
}

export default function AffordabilityComparison({
  productName,
  planName,
  summary,
  rows,
  locale = "zh",
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("pressure");
  const copy = getAffordabilityCopy(locale);
  const model = useMemo(() => {
    const descending = [...rows].sort((a, b) => b.burdenVsUs - a.burdenVsUs);
    const ascending = [...descending].reverse();

    return {
      descending,
      ascending,
      highest: descending[0],
      lowest: ascending[0],
      us: rows.find((row) => row.countryCode.toUpperCase() === "US"),
    };
  }, [rows]);

  if (!summary || rows.length === 0) return null;

  const orderedRows = sortMode === "pressure" ? model.descending : model.ascending;
  const initialVisibleCount = Math.min(8, orderedRows.length);
  const visibleRows = orderedRows.slice(0, initialVisibleCount);
  const hiddenRows = orderedRows.slice(initialVisibleCount);
  const maxBurden = Math.max(1, ...rows.map((row) => row.burdenVsUs));
  const latestPriceCheckedAt = rows
    .map((row) => row.priceLastCheckedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  return (
    <PublicSection>
      <PublicSectionHeader
        title={copy.sectionTitle(productName)}
        description={copy.sectionDescription(planName)}
      />

      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        <SummaryMetric
          label={copy.highestBurden}
          value={getCountryName(model.highest, locale)}
          helper={copy.highestBurdenHelper(
            formatPercent(model.highest.incomeSharePercent),
            model.highest.burdenVsUs.toFixed(2),
          )}
          tone="red"
        />
        <SummaryMetric
          label={copy.lowestBurden}
          value={getCountryName(model.lowest, locale)}
          helper={copy.lowestBurdenHelper(
            formatPercent(model.lowest.incomeSharePercent),
            model.lowest.burdenVsUs.toFixed(2),
          )}
          tone="green"
        />
        <SummaryMetric
          label={copy.usBase}
          value={model.us ? formatPercent(model.us.incomeSharePercent) : "-"}
          helper={copy.usBaseHelper(model.us ? formatPercent(model.us.incomeSharePercent) : "-")}
        />
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{copy.chartTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{copy.chartDescription}</p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900" aria-label={copy.chartTitle}>
            {(["pressure", "accessible"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sortMode === mode}
                className={[
                  "h-8 rounded-md px-3 text-xs font-medium transition",
                  sortMode === mode
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                ].join(" ")}
                onClick={() => setSortMode(mode)}
              >
                {mode === "pressure" ? copy.pressureFirst : copy.accessibleFirst}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden gap-3 border-y border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:grid-cols-[52px_minmax(140px,0.8fr)_120px_minmax(280px,1.5fr)] md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>{copy.rank}</div>
          <div>{copy.region}</div>
          <div>{copy.monthlyFee}</div>
          <div className="flex items-center justify-between gap-3">
            <span>{copy.burden}</span>
            <span className="font-normal">{copy.usBenchmark}</span>
          </div>
        </div>

        {visibleRows.map((row, index) => (
          <BurdenRow
            key={`${sortMode}-${row.planSlug}-${row.countryCode}`}
            row={row}
            rank={index + 1}
            maxBurden={maxBurden}
            locale={locale}
          />
        ))}

        <ExpandableAffordabilityRows hiddenCount={hiddenRows.length} locale={locale}>
          {hiddenRows.map((row, index) => (
            <BurdenRow
              key={`${sortMode}-${row.planSlug}-${row.countryCode}`}
              row={row}
              rank={initialVisibleCount + index + 1}
              maxBurden={maxBurden}
              locale={locale}
            />
          ))}
        </ExpandableAffordabilityRows>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:px-6">
        <span className="mr-2 font-semibold text-zinc-700 dark:text-zinc-200">{copy.methodLabel}</span>
        {copy.method}
      </div>

      <DataNote>
        {copy.dataNote(
          metricLabel(summary.incomeMetricType),
          summary.incomeIndicatorCode || "",
          String(summary.incomeDataYear || "-"),
          formatDate(latestPriceCheckedAt),
        )}
      </DataNote>
    </PublicSection>
  );
}
