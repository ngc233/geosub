import { type getComparablePriceRows } from "./country-hubs.ts";
import { getPublicCountryHref } from "./country-route-catalog.ts";
import { getPriceChanges, type PriceObservationRecord } from "./price-records.ts";
import type { CanvasLocale } from "./canvas-ui-copy.ts";

type ComparableRows = ReturnType<typeof getComparablePriceRows>;

export type CountrySavingsCategory = "all" | "ai" | "streaming";

export type CountrySavingsMapItem = {
  code: string;
  median: number;
  best: number;
  count: number;
  cheaper: number;
  href: string | null;
};

export function computeCountrySavingsForRows(
  rows: ComparableRows,
  minPlans: number,
  locale: CanvasLocale = "zh",
): CountrySavingsMapItem[] {
  const countries = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.countryCode === "US" || !row.usPrice || !Number.isFinite(row.usPrice) || row.usPrice <= 0) continue;
    const plans = countries.get(row.countryCode) ?? new Map<string, number>();
    const key = JSON.stringify([row.productSlug, row.planSlug, row.platform, row.billingCycle]);
    if (!plans.has(key)) plans.set(key, 1 - row.usd / row.usPrice);
    countries.set(row.countryCode, plans);
  }
  return [...countries]
    .flatMap(([code, plans]) => {
      if (plans.size < minPlans) return [];
      const values = [...plans.values()].sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
      const best = values[values.length - 1];
      return [
        {
          code,
          median,
          best,
          count: values.length,
          cheaper: values.filter((v) => v > 0).length,
          href: getPublicCountryHref(code, locale),
        },
      ];
    })
    .sort((a, b) => b.median - a.median || a.code.localeCompare(b.code));
}

export function buildCountrySavingsViews(rows: ComparableRows, locale: CanvasLocale = "zh") {
  const hasUsBaseline = rows.some((row) => row.countryCode === "US");
  return {
    hasUsBaseline,
    byCategory: {
      all: computeCountrySavingsForRows(rows, 5, locale),
      ai: computeCountrySavingsForRows(
        rows.filter((row) => row.category === "ai"),
        3,
        locale,
      ),
      streaming: computeCountrySavingsForRows(
        rows.filter((row) => row.category === "streaming"),
        3,
        locale,
      ),
    } satisfies Record<CountrySavingsCategory, CountrySavingsMapItem[]>,
  };
}

export type RadarEventItem = {
  id: string;
  beforeId: string;
  productSlug: string;
  productName: string;
  planName: string;
  countryCode: string;
  observedAt: string;
  beforeObservedAt: string;
  beforeAmount: number;
  afterAmount: number;
  currency: string;
  billingCycle: string | null;
  direction: "increase" | "decrease";
  percent: number;
};

export type RadarCountryNode = {
  code: string;
  status: "increase" | "decrease" | "mixed" | "monitored";
  eventCount: number;
  increaseCount: number;
  decreaseCount: number;
  latestEvent: RadarEventItem | null;
};

export function extractWindowRadarEvents(
  records: PriceObservationRecord[],
  now = new Date(),
  windowDays = 30,
  limit = 50,
  truncated = false,
): RadarEventItem[] {
  if (truncated) return [];
  const end = now.getTime();
  const start = end - windowDays * 86_400_000;
  return getPriceChanges(records.filter((row) => Date.parse(row.observedAt) <= end))
    .filter((event) => Date.parse(event.after.observedAt) >= start)
    .slice(0, limit)
    .map(({ before, after, direction, percent }) => ({
      id: after.id,
      beforeId: before.id,
      productSlug: after.productSlug,
      productName: after.productName,
      planName: after.planName,
      countryCode: after.countryCode,
      observedAt: after.observedAt,
      beforeObservedAt: before.observedAt,
      beforeAmount: before.amount,
      afterAmount: after.amount,
      currency: after.currency,
      billingCycle: after.billingCycle,
      direction,
      percent,
    }));
}

export function buildPriceHistoryRadar(events: RadarEventItem[], observedCodes: string[]) {
  const byCountry = new Map<string, RadarEventItem[]>();
  const allCodes = new Set<string>();

  for (const code of observedCodes) {
    if (/^[A-Z]{2}$/.test(code)) allCodes.add(code);
  }
  for (const event of events) {
    if (!/^[A-Z]{2}$/.test(event.countryCode)) continue;
    allCodes.add(event.countryCode);
    const list = byCountry.get(event.countryCode) ?? [];
    list.push(event);
    byCountry.set(event.countryCode, list);
  }

  const nodes: RadarCountryNode[] = [...allCodes].map((code) => {
    const list = (byCountry.get(code) ?? []).sort(
      (a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id),
    );
    const increaseCount = list.filter((e) => e.direction === "increase").length;
    const decreaseCount = list.filter((e) => e.direction === "decrease").length;
    const status: RadarCountryNode["status"] =
      list.length === 0
        ? "monitored"
        : increaseCount > 0 && decreaseCount > 0
          ? "mixed"
          : increaseCount > 0
            ? "increase"
            : "decrease";
    return {
      code,
      status,
      eventCount: list.length,
      increaseCount,
      decreaseCount,
      latestEvent: list[0] ?? null,
    };
  });

  nodes.sort((a, b) => {
    if ((a.eventCount > 0) !== (b.eventCount > 0)) return a.eventCount > 0 ? -1 : 1;
    if (a.eventCount !== b.eventCount) return b.eventCount - a.eventCount;
    if (a.latestEvent && b.latestEvent) {
      const timeDiff = Date.parse(b.latestEvent.observedAt) - Date.parse(a.latestEvent.observedAt);
      if (timeDiff !== 0) return timeDiff;
    }
    return a.code.localeCompare(b.code);
  });

  const changedCount = nodes.filter((n) => n.eventCount > 0).length;
  const monitoredCount = nodes.length;
  return {
    nodes,
    changedCount,
    monitoredCount,
    stableCount: Math.max(0, monitoredCount - changedCount),
    increaseEvents: events.filter((e) => e.direction === "increase").length,
    decreaseEvents: events.filter((e) => e.direction === "decrease").length,
  };
}
