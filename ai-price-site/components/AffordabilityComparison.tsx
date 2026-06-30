"use client";

import type { FocusEvent, MouseEvent } from "react";
import { useState } from "react";
import type {
  PlanAffordabilityRow,
  PlanAffordabilitySummary,
} from "../lib/affordability";
import type { DetailLocale } from "../lib/detail-page-copy";
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
  locale?: DetailLocale;
};

const localeMap: Record<DetailLocale, string> = {
  zh: "zh-CN",
  en: "en",
  es: "es",
  ja: "ja",
  ko: "ko",
  de: "de",
  fr: "fr",
  ar: "ar",
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

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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

function levelLabel(level: string) {
  const map: Record<string, string> = {
    LOW: "低负担",
    MODERATE_LOW: "较低负担",
    MODERATE: "中等负担",
    HIGH: "高负担",
    VERY_HIGH: "极高负担",
  };

  return map[level] || level;
}

function levelTone(level: string) {
  if (level === "VERY_HIGH" || level === "HIGH") {
    return {
      text: "text-rose-600 dark:text-rose-300",
      bar: "bg-rose-500",
      dot: "bg-rose-500",
    };
  }

  if (level === "MODERATE") {
    return {
      text: "text-amber-700 dark:text-amber-300",
      bar: "bg-amber-500",
      dot: "bg-amber-500",
    };
  }

  return {
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  };
}

function getCountryName(row: PlanAffordabilityRow | null | undefined, locale: DetailLocale) {
  if (!row) return "-";

  try {
    const displayNames = new Intl.DisplayNames([localeMap[locale] || "en"], {
      type: "region",
    });
    const localizedName = displayNames.of(row.countryCode.toUpperCase());

    if (localizedName) {
      return localizedName;
    }
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

function BurdenRow({
  row,
  rank,
  maxShare,
  locale,
}: {
  row: PlanAffordabilityRow;
  rank: number;
  maxShare: number;
  locale: DetailLocale;
}) {
  const tone = levelTone(row.affordabilityLevel);

  return (
    <div className="grid gap-3 border-b border-zinc-100 px-5 py-3.5 last:border-b-0 md:grid-cols-[54px_minmax(150px,1fr)_110px_minmax(190px,1.25fr)_110px_108px] md:items-center md:px-6 dark:border-zinc-800">
      <div className="text-sm tabular-nums text-zinc-400">#{rank}</div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">
          {getCountryName(row, locale)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{row.countryCode}</div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">月费</div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatUsd(row.priceUsd)}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">占月收入</span>
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
          月均收入约 {formatUsd(row.monthlyIncomeUsd, 0)}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">对比美国</div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {row.burdenVsUs.toFixed(2)} 倍
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-zinc-400 md:hidden">判断</div>
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          {levelLabel(row.affordabilityLevel)}
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
  if (!summary || rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort(
    (a, b) => b.incomeSharePercent - a.incomeSharePercent,
  );
  const highest = sortedRows[0];
  const lowest = [...rows].sort(
    (a, b) => a.incomeSharePercent - b.incomeSharePercent,
  )[0];
  const us = rows.find((row) => row.countryCode.toUpperCase() === "US");
  const initialVisibleCount = Math.min(5, sortedRows.length);
  const visibleRows = sortedRows.slice(0, initialVisibleCount);
  const hiddenRows = sortedRows.slice(initialVisibleCount);
  const maxShare = Math.max(...sortedRows.map((row) => row.incomeSharePercent));
  const latestPriceCheckedAt = rows
    .map((row) => row.priceLastCheckedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  return (
    <PublicSection>
      <PublicSectionHeader
        eyebrow="Affordability index"
        title="本地订阅负担指数"
        description={
          <>
            用 {planName} 月费与当地月均收入对比，判断同样的 {productName} 价格在不同地区是否真正容易承担。
          </>
        }
      />

      <MetricStrip columns={3}>
        <MetricItem
          label="负担最高"
          value={getCountryName(highest, locale)}
          helper={`占月收入 ${formatPercent(highest.incomeSharePercent)} · 美国的 ${highest.burdenVsUs.toFixed(2)} 倍`}
          tone="red"
        />
        <MetricItem
          label="最容易承担"
          value={getCountryName(lowest, locale)}
          helper={`占月收入 ${formatPercent(lowest.incomeSharePercent)}`}
          tone="green"
        />
        <MetricItem
          label="美国基准"
          value={us ? formatPercent(us.incomeSharePercent) : "-"}
          helper="记为 1.00 倍"
        />
      </MetricStrip>

      <div className="overflow-hidden">
        <div className="hidden gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:grid-cols-[54px_minmax(150px,1fr)_110px_minmax(190px,1.25fr)_110px_108px] md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>排名</div>
          <div>地区</div>
          <div>月费</div>
          <HeaderHelp
            label="占月收入"
            help="月费占当地月均收入的比例，用来估算订阅负担。"
          />
          <HeaderHelp
            label="对比美国"
            help="以美国订阅负担为 1.00 倍，显示该地区相对美国更重或更轻。"
          />
          <HeaderHelp
            label="判断"
            help="根据占月收入和相对美国负担，对该地区订阅压力做分级。"
            className="pl-4"
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

        <ExpandableAffordabilityRows hiddenCount={hiddenRows.length}>
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
        收入指标采用 {metricLabel(summary.incomeMetricType)}
        {summary.incomeIndicatorCode ? `（${summary.incomeIndicatorCode}）` : ""}；
        收入数据年份为 {summary.incomeDataYear || "-"}，价格检查时间为{" "}
        {formatDate(latestPriceCheckedAt)}。
      </DataNote>
    </PublicSection>
  );
}
