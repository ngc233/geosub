"use client";

import type { FocusEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import type {
  PlanAffordabilityRow,
  PlanAffordabilitySummary,
} from "../lib/affordability";
import type { SiteLocale } from "../lib/site-locale";
import ExpandableAffordabilityRows from "./ExpandableAffordabilityRows";
import {
  DataNote,
  MetricItem,
  MetricStrip,
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

type Quadrant = "friendly" | "cheapPressure" | "premiumFair" | "expensivePressure";

const affordabilityCopy = {
  zh: {
    levels: {
      LOW: "低负担",
      MODERATE_LOW: "较低负担",
      MODERATE: "中等负担",
      HIGH: "高负担",
      VERY_HIGH: "极高负担",
    },
    quadrants: {
      friendly: {
        label: "便宜且友好",
        desc: "美元价格低于美国，本地负担也接近或低于美国。",
      },
      cheapPressure: {
        label: "便宜但吃力",
        desc: "美元价格看起来便宜，但按当地收入仍然偏贵。",
      },
      premiumFair: {
        label: "贵但可承受",
        desc: "标价高于美国，但本地收入能消化一部分溢价。",
      },
      expensivePressure: {
        label: "贵且负担高",
        desc: "价格和收入负担都不友好，主要用于风险提示。",
      },
    },
    times: "倍",
    monthlyFee: "月费",
    incomeShare: "占月收入",
    monthlyIncome: "月均收入约",
    vsUs: "对比美国",
    judgement: "判断",
    matrixTitle: "价格 × 本地负担矩阵",
    matrixDescription:
      "横轴看美元价格是否比美国便宜，纵轴看本地负担是否高于美国。越靠左下越友好。",
    usBenchmark: "美国基准：0% / 1.00 倍",
    highBurden: "高负担",
    moreExpensive: "更贵",
    cheaper: "更便宜",
    sectionTitle: (productName: string) => `${productName} 本地购买力判断`,
    sectionDescription: (planName: string) =>
      `不只看哪个地区标价最低，而是把 ${planName} 月费放回当地收入里比较：价格、税务和风险之外，再判断这笔订阅对当地用户到底重不重。`,
    highestBurden: "本地负担最高",
    friendlyRegion: "本地更友好",
    usBase: "美国基准",
    highestBurdenHelper: (share: string, times: string) =>
      `占月收入 ${share} · 美国的 ${times} 倍`,
    friendlyHelper: (share: string) => `占月收入 ${share}`,
    usBaseHelper: "记为 1.00 倍，用于判断相对负担",
    balancedTitle: "综合更均衡",
    balancedNote: "价格和本地负担都相对克制，适合作为友好地区候选。",
    cheapPressureTitle: "便宜但需谨慎",
    cheapPressureNote: "美元标价低，但当地收入负担明显偏高，不能只按便宜排序。",
    highestPressureTitle: "本地压力最高",
    highestPressureNote: "本地收入压力最明显，适合放入风险和解释提示。",
    rank: "排名",
    region: "地区",
    incomeShareHelp: "月费占当地月均收入的比例，用来估算订阅负担。",
    vsUsHelp: "以美国订阅负担为 1.00 倍，显示该地区相对美国更重或更轻。",
    judgementHelp: "结合收入占比、美国基准和美元价差，对地区订阅压力做分层。",
    helpAria: (label: string, help: string) => `${label}说明：${help}`,
    decisionDetail: (note: string, price: string, share: string) =>
      `${note} 月费 ${price}，占月收入 ${share}。`,
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `收入指标采用 ${metric}${indicator ? `（${indicator}）` : ""}，收入数据年份为 ${year}，价格检查时间为 ${checked}。购买力判断用于解释价格压力，不等同于实际支付能力或订阅成功率。`,
  },
  en: {
    levels: {
      LOW: "Low burden",
      MODERATE_LOW: "Moderately low",
      MODERATE: "Moderate burden",
      HIGH: "High burden",
      VERY_HIGH: "Very high burden",
    },
    quadrants: {
      friendly: {
        label: "Cheaper and accessible",
        desc: "The USD price is below the US price and the local burden is close to or below the US level.",
      },
      cheapPressure: {
        label: "Cheaper but burdensome",
        desc: "The USD price looks lower, but it remains expensive relative to local income.",
      },
      premiumFair: {
        label: "Premium but manageable",
        desc: "The price is above the US level, but local income offsets part of the premium.",
      },
      expensivePressure: {
        label: "Expensive and burdensome",
        desc: "Both the price and income burden are unfavorable and merit a clear warning.",
      },
    },
    times: "×",
    monthlyFee: "Monthly price",
    incomeShare: "Share of monthly income",
    monthlyIncome: "Estimated monthly income",
    vsUs: "Vs US burden",
    judgement: "Assessment",
    matrixTitle: "Price × local burden matrix",
    matrixDescription:
      "The horizontal axis compares the USD price with the US price. The vertical axis shows the local burden relative to the US. Lower-left is more favorable.",
    usBenchmark: "US benchmark: 0% / 1.00×",
    highBurden: "Higher burden",
    moreExpensive: "More expensive",
    cheaper: "Cheaper",
    sectionTitle: (productName: string) => `${productName} local purchasing power`,
    sectionDescription: (planName: string) =>
      `This view puts the ${planName} monthly price in the context of local income. It complements price, tax, and risk data by showing how heavy the subscription may feel locally.`,
    highestBurden: "Highest local burden",
    friendlyRegion: "Most accessible locally",
    usBase: "US benchmark",
    highestBurdenHelper: (share: string, times: string) =>
      `${share} of monthly income · ${times}× the US burden`,
    friendlyHelper: (share: string) => `${share} of monthly income`,
    usBaseHelper: "Defined as 1.00× for relative burden comparisons",
    balancedTitle: "Best balance",
    balancedNote: "Both the price and local burden are relatively restrained, making this a more accessible candidate.",
    cheapPressureTitle: "Cheap, with caution",
    cheapPressureNote: "The USD price is low, but the local income burden is high, so price alone is misleading.",
    highestPressureTitle: "Highest local pressure",
    highestPressureNote: "This region has the strongest income pressure and should carry a clear affordability warning.",
    rank: "Rank",
    region: "Region",
    incomeShareHelp: "The monthly fee as a share of estimated local monthly income.",
    vsUsHelp: "Uses the US subscription burden as 1.00× and shows whether this region is heavier or lighter.",
    judgementHelp: "Combines income share, the US benchmark, and the USD price difference into an affordability tier.",
    helpAria: (label: string, help: string) => `${label}: ${help}`,
    decisionDetail: (note: string, price: string, share: string) =>
      `${note} Monthly price ${price}, representing ${share} of monthly income.`,
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `Income metric: ${metric}${indicator ? ` (${indicator})` : ""}. Income data year: ${year}. Price checked: ${checked}. Purchasing-power analysis explains relative price pressure; it does not guarantee payment ability or subscription success.`,
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

function formatSignedPercent(value: number) {
  if (value > 0) return `+${Math.round(value)}%`;
  return `${Math.round(value)}%`;
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

function levelLabel(level: string, locale: SiteLocale) {
  const labels = getAffordabilityCopy(locale).levels as Record<string, string>;
  return labels[level] || level;
}

function levelTone(level: string) {
  if (level === "VERY_HIGH" || level === "HIGH") {
    return {
      text: "text-rose-600 dark:text-rose-300",
      bar: "bg-rose-500",
      dot: "bg-rose-500",
      badge: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800",
    };
  }

  if (level === "MODERATE") {
    return {
      text: "text-amber-700 dark:text-amber-300",
      bar: "bg-amber-500",
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    };
  }

  return {
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
  };
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

function getShareWidth(row: PlanAffordabilityRow, maxShare: number) {
  if (maxShare <= 0) return 6;
  return Math.max(6, Math.min(100, (row.incomeSharePercent / maxShare) * 100));
}

function classifyQuadrant(row: PlanAffordabilityRow): Quadrant {
  const cheap = row.diffVsUsPercent < 0;
  const heavy = row.burdenVsUs > 1.2;

  if (cheap && !heavy) return "friendly";
  if (cheap && heavy) return "cheapPressure";
  if (!cheap && !heavy) return "premiumFair";
  return "expensivePressure";
}

function quadrantCopy(quadrant: Quadrant, locale: SiteLocale) {
  const item = getAffordabilityCopy(locale).quadrants[quadrant];
  const dotMap: Record<Quadrant, string> = {
    friendly: "bg-emerald-500",
    cheapPressure: "bg-amber-500",
    premiumFair: "bg-sky-500",
    expensivePressure: "bg-rose-500",
  };

  return { ...item, dot: dotMap[quadrant] };
}

function quadrantPointClass(quadrant: Quadrant) {
  if (quadrant === "friendly") return "border-emerald-500 bg-emerald-500";
  if (quadrant === "cheapPressure") return "border-amber-500 bg-amber-500";
  if (quadrant === "premiumFair") return "border-sky-500 bg-sky-500";
  return "border-rose-500 bg-rose-500";
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
        aria-label={getAffordabilityCopy(locale).helpAria(label, help)}
        onMouseEnter={showTooltip}
        onFocus={showTooltip}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span
          className="pointer-events-none fixed z-[80] max-w-[260px] -translate-x-1/2 rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 text-left text-xs font-normal leading-5 text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:text-zinc-300"
          style={{ left: position.x, top: position.y }}
        >
          {help}
        </span>
      ) : null}
    </div>
  );
}

function DecisionCard({
  title,
  row,
  locale,
  tone,
  note,
}: {
  title: string;
  row?: PlanAffordabilityRow;
  locale: SiteLocale;
  tone: "green" | "amber" | "red";
  note: string;
}) {
  if (!row) return null;

  const copy = getAffordabilityCopy(locale);

  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
        : "border-rose-200 bg-rose-50/60 text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-medium opacity-75">{title}</div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{getCountryName(row, locale)}</div>
          <div className="mt-1 text-xs opacity-75">{row.countryCode}</div>
        </div>
        <div className="text-right text-sm font-semibold tabular-nums">
          {row.burdenVsUs.toFixed(2)}{copy.times}
        </div>
      </div>
      <div className="mt-3 text-xs leading-5 opacity-80">
        {copy.decisionDetail(
          note,
          formatUsd(row.priceUsd),
          formatPercent(row.incomeSharePercent),
        )}
      </div>
    </div>
  );
}

function AffordabilityMatrix({
  rows,
  locale,
}: {
  rows: PlanAffordabilityRow[];
  locale: SiteLocale;
}) {
  const copy = getAffordabilityCopy(locale);
  const matrixRows = rows.slice(0, 24);
  const xValues = matrixRows.map((row) => row.diffVsUsPercent);
  const yValues = matrixRows.map((row) => row.burdenVsUs);
  const minX = Math.min(-30, ...xValues);
  const maxX = Math.max(40, ...xValues);
  const minY = Math.min(0.5, ...yValues);
  const maxY = Math.max(2.5, ...yValues);
  const xRange = Math.max(1, maxX - minX);
  const yRange = Math.max(1, maxY - minY);
  const usX = Math.max(0, Math.min(100, ((0 - minX) / xRange) * 100));
  const usY = Math.max(0, Math.min(100, ((1 - minY) / yRange) * 100));

  return (
    <div className="border-t border-zinc-100 px-5 py-5 dark:border-zinc-800 md:px-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <div>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                {copy.matrixTitle}
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {copy.matrixDescription}
              </p>
            </div>
            <div className="text-xs text-zinc-400">{copy.usBenchmark}</div>
          </div>

          <div className="relative h-[320px] overflow-hidden rounded-lg border border-zinc-200 bg-[linear-gradient(to_right,rgba(113,113,122,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.10)_1px,transparent_1px)] bg-[size:25%_25%] dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="absolute inset-y-0 border-l border-zinc-300/80 dark:border-zinc-700" style={{ left: `${usX}%` }} />
            <div className="absolute inset-x-0 border-t border-zinc-300/80 dark:border-zinc-700" style={{ bottom: `${usY}%` }} />
            <div className="absolute left-3 top-3 text-xs text-zinc-400">{copy.highBurden}</div>
            <div className="absolute bottom-3 right-3 text-xs text-zinc-400">{copy.moreExpensive}</div>
            <div className="absolute bottom-3 left-3 text-xs text-zinc-400">{copy.cheaper}</div>

            {matrixRows.map((row) => {
              const x = Math.max(4, Math.min(96, ((row.diffVsUsPercent - minX) / xRange) * 100));
              const y = Math.max(8, Math.min(92, ((row.burdenVsUs - minY) / yRange) * 100));
              const quadrant = classifyQuadrant(row);
              const isUs = row.countryCode.toUpperCase() === "US";

              return (
                <div
                  key={`${row.planSlug}-${row.countryCode}-matrix`}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${x}%`, bottom: `${y}%` }}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={[
                        "h-3 w-3 rounded-full border-2 shadow-sm",
                        isUs ? "border-zinc-900 bg-white dark:border-white dark:bg-zinc-950" : quadrantPointClass(quadrant),
                      ].join(" ")}
                    />
                    <span className="hidden rounded bg-white/80 px-1 text-[10px] font-medium text-zinc-500 shadow-sm md:inline dark:bg-zinc-900/80 dark:text-zinc-300">
                      {row.countryCode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 content-start">
          {(["friendly", "cheapPressure", "premiumFair", "expensivePressure"] as Quadrant[]).map((quadrant) => {
            const quadrantText = quadrantCopy(quadrant, locale);
            const count = rows.filter((row) => classifyQuadrant(row) === quadrant).length;

            return (
              <div key={quadrant} className="rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${quadrantText.dot}`} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{quadrantText.label}</span>
                  </div>
                  <span className="text-xs tabular-nums text-zinc-400">{count}</span>
                </div>
                <div className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{quadrantText.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BurdenRow({
  row,
  rank,
  maxShare,
  locale,
}: {
  row: PlanAffordabilityRow;
  rank: number;
  maxShare: number;
  locale: SiteLocale;
}) {
  const tone = levelTone(row.affordabilityLevel);
  const copy = getAffordabilityCopy(locale);
  const quadrant = quadrantCopy(classifyQuadrant(row), locale);

  return (
    <div className="grid gap-3 border-b border-zinc-100 px-5 py-3.5 last:border-b-0 md:grid-cols-[54px_minmax(150px,1fr)_110px_minmax(190px,1.25fr)_110px_120px] md:items-center md:px-6 dark:border-zinc-800">
      <div className="text-sm tabular-nums text-zinc-400">#{rank}</div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">
          {getCountryName(row, locale)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{row.countryCode}</div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">{copy.monthlyFee}</div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatUsd(row.priceUsd)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{formatSignedPercent(row.diffVsUsPercent)}</div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">{copy.incomeShare}</span>
          <span className={`text-sm font-semibold tabular-nums ${tone.text}`}>
            {formatPercent(row.incomeSharePercent)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${getShareWidth(row, maxShare)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-zinc-400">
          {copy.monthlyIncome} {formatUsd(row.monthlyIncomeUsd, 0)}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">{copy.vsUs}</div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {row.burdenVsUs.toFixed(2)}{copy.times}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">{copy.judgement}</div>
        <div className="flex flex-col items-start gap-1.5">
          <span className={["inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tone.badge].join(" ")}>
            {levelLabel(row.affordabilityLevel, locale)}
          </span>
          <span className="text-xs text-zinc-400">{quadrant.label}</span>
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
  const copy = getAffordabilityCopy(locale);
  const model = useMemo(() => {
    const byBurdenDesc = [...rows].sort((a, b) => b.incomeSharePercent - a.incomeSharePercent);
    const byBurdenAsc = [...rows].sort((a, b) => a.incomeSharePercent - b.incomeSharePercent);
    const byPriceAsc = [...rows].sort((a, b) => a.priceUsd - b.priceUsd);
    const balanced = byPriceAsc.find((row) => row.burdenVsUs <= 1.25) || byBurdenAsc[0];
    const cheapButHeavy = byPriceAsc.find((row) => row.diffVsUsPercent < 0 && row.burdenVsUs > 1.5);

    return {
      byBurdenDesc,
      byBurdenAsc,
      highest: byBurdenDesc[0],
      lowest: byBurdenAsc[0],
      balanced,
      cheapButHeavy,
      us: rows.find((row) => row.countryCode.toUpperCase() === "US"),
    };
  }, [rows]);

  if (!summary || rows.length === 0) {
    return null;
  }

  const initialVisibleCount = Math.min(6, model.byBurdenDesc.length);
  const visibleRows = model.byBurdenDesc.slice(0, initialVisibleCount);
  const hiddenRows = model.byBurdenDesc.slice(initialVisibleCount);
  const maxShare = Math.max(...model.byBurdenDesc.map((row) => row.incomeSharePercent));
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

      <MetricStrip columns={3}>
        <MetricItem
          label={copy.highestBurden}
          value={getCountryName(model.highest, locale)}
          helper={copy.highestBurdenHelper(
            formatPercent(model.highest.incomeSharePercent),
            model.highest.burdenVsUs.toFixed(2),
          )}
          tone="red"
        />
        <MetricItem
          label={copy.friendlyRegion}
          value={getCountryName(model.lowest, locale)}
          helper={copy.friendlyHelper(
            formatPercent(model.lowest.incomeSharePercent),
          )}
          tone="green"
        />
        <MetricItem
          label={copy.usBase}
          value={model.us ? formatPercent(model.us.incomeSharePercent) : "-"}
          helper={copy.usBaseHelper}
        />
      </MetricStrip>

      <div className="grid gap-3 border-t border-zinc-100 px-5 py-5 dark:border-zinc-800 md:grid-cols-3 md:px-6">
        <DecisionCard
          title={copy.balancedTitle}
          row={model.balanced}
          locale={locale}
          tone="green"
          note={copy.balancedNote}
        />
        <DecisionCard
          title={copy.cheapPressureTitle}
          row={model.cheapButHeavy}
          locale={locale}
          tone="amber"
          note={copy.cheapPressureNote}
        />
        <DecisionCard
          title={copy.highestPressureTitle}
          row={model.highest}
          locale={locale}
          tone="red"
          note={copy.highestPressureNote}
        />
      </div>

      <AffordabilityMatrix rows={rows} locale={locale} />

      <div className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800">
        <div className="hidden gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:grid-cols-[54px_minmax(150px,1fr)_110px_minmax(190px,1.25fr)_110px_120px] md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>{copy.rank}</div>
          <div>{copy.region}</div>
          <div>{copy.monthlyFee}</div>
          <HeaderHelp
            label={copy.incomeShare}
            help={copy.incomeShareHelp}
            locale={locale}
          />
          <HeaderHelp
            label={copy.vsUs}
            help={copy.vsUsHelp}
            locale={locale}
          />
          <HeaderHelp
            label={copy.judgement}
            help={copy.judgementHelp}
            locale={locale}
          />
        </div>

        {visibleRows.map((row, index) => (
          <BurdenRow
            key={`${row.planSlug}-${row.countryCode}`}
            row={row}
            rank={index + 1}
            maxShare={maxShare}
            locale={locale}
          />
        ))}

        <ExpandableAffordabilityRows hiddenCount={hiddenRows.length} locale={locale}>
          {hiddenRows.map((row, index) => (
            <BurdenRow
              key={`${row.planSlug}-${row.countryCode}`}
              row={row}
              rank={initialVisibleCount + index + 1}
              maxShare={maxShare}
              locale={locale}
            />
          ))}
        </ExpandableAffordabilityRows>
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
