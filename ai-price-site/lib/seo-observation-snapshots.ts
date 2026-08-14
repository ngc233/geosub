export const SEO_OBSERVATION_SETTING_KEY = "seo_gsc_observation_snapshots";
export const SEO_BING_OBSERVATION_SETTING_KEY = "seo_bing_observation_snapshots";
export const SEO_OBSERVATION_HISTORY_LIMIT = 24;

export type SeoObservationSnapshot = {
  date: string;
  clicks: number;
  impressions: number;
  indexedPages: number;
  discoveredNotIndexed: number;
  crawledNotIndexed: number;
};

export type SeoTrafficObservationSnapshot = {
  date: string;
  clicks: number;
  impressions: number;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_METRIC_VALUE = 100_000_000;

function isValidDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isMetric(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_METRIC_VALUE
  );
}

function parseMetric(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return Number.NaN;
  }

  return Number(value);
}

export function createSeoObservationSnapshot(input: {
  date: unknown;
  clicks: unknown;
  impressions: unknown;
  indexedPages: unknown;
  discoveredNotIndexed: unknown;
  crawledNotIndexed: unknown;
}): SeoObservationSnapshot {
  const snapshot = {
    date: String(input.date || "").trim(),
    clicks: parseMetric(input.clicks),
    impressions: parseMetric(input.impressions),
    indexedPages: parseMetric(input.indexedPages),
    discoveredNotIndexed: parseMetric(input.discoveredNotIndexed),
    crawledNotIndexed: parseMetric(input.crawledNotIndexed),
  };

  if (
    !isValidDate(snapshot.date) ||
    !isMetric(snapshot.clicks) ||
    !isMetric(snapshot.impressions) ||
    !isMetric(snapshot.indexedPages) ||
    !isMetric(snapshot.discoveredNotIndexed) ||
    !isMetric(snapshot.crawledNotIndexed) ||
    snapshot.clicks > snapshot.impressions
  ) {
    throw new Error("Invalid SEO observation snapshot.");
  }

  return snapshot;
}

export function createSeoTrafficObservationSnapshot(input: {
  date: unknown;
  clicks: unknown;
  impressions: unknown;
}): SeoTrafficObservationSnapshot {
  const snapshot = {
    date: String(input.date || "").trim(),
    clicks: parseMetric(input.clicks),
    impressions: parseMetric(input.impressions),
  };

  if (
    !isValidDate(snapshot.date) ||
    !isMetric(snapshot.clicks) ||
    !isMetric(snapshot.impressions) ||
    snapshot.clicks > snapshot.impressions
  ) {
    throw new Error("Invalid SEO traffic observation snapshot.");
  }

  return snapshot;
}

export function parseSeoObservationSnapshots(
  value: string | null | undefined,
): SeoObservationSnapshot[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((item) => {
        try {
          return [createSeoObservationSnapshot(item)];
        } catch {
          return [];
        }
      })
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, SEO_OBSERVATION_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendSeoObservationSnapshot(
  snapshots: SeoObservationSnapshot[],
  next: SeoObservationSnapshot,
) {
  return [next, ...snapshots.filter((item) => item.date !== next.date)]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, SEO_OBSERVATION_HISTORY_LIMIT);
}

export function parseSeoTrafficObservationSnapshots(
  value: string | null | undefined,
): SeoTrafficObservationSnapshot[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((item) => {
        try {
          return [createSeoTrafficObservationSnapshot(item)];
        } catch {
          return [];
        }
      })
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, SEO_OBSERVATION_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendSeoTrafficObservationSnapshot(
  snapshots: SeoTrafficObservationSnapshot[],
  next: SeoTrafficObservationSnapshot,
) {
  return [next, ...snapshots.filter((item) => item.date !== next.date)]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, SEO_OBSERVATION_HISTORY_LIMIT);
}

export function getSeoObservationCtr(
  snapshot: Pick<SeoObservationSnapshot, "clicks" | "impressions">,
) {
  if (snapshot.impressions === 0) return 0;
  return Math.round((snapshot.clicks / snapshot.impressions) * 10_000) / 100;
}

export function getSeoTrafficObservationDelta(
  current: SeoTrafficObservationSnapshot,
  previous?: SeoTrafficObservationSnapshot,
) {
  if (!previous) return null;

  return {
    clicks: current.clicks - previous.clicks,
    impressions: current.impressions - previous.impressions,
    ctr:
      Math.round(
        (getSeoObservationCtr(current) - getSeoObservationCtr(previous)) * 100,
      ) / 100,
  };
}

export function getSeoObservationDelta(
  current: SeoObservationSnapshot,
  previous?: SeoObservationSnapshot,
) {
  if (!previous) return null;

  return {
    clicks: current.clicks - previous.clicks,
    impressions: current.impressions - previous.impressions,
    ctr:
      Math.round(
        (getSeoObservationCtr(current) - getSeoObservationCtr(previous)) * 100,
      ) / 100,
    indexedPages: current.indexedPages - previous.indexedPages,
    discoveredNotIndexed:
      current.discoveredNotIndexed - previous.discoveredNotIndexed,
    crawledNotIndexed:
      current.crawledNotIndexed - previous.crawledNotIndexed,
  };
}

export function getSeoObservationReviewWindow(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const earliest = new Date(start);
  const latest = new Date(start);
  earliest.setUTCDate(earliest.getUTCDate() + 14);
  latest.setUTCDate(latest.getUTCDate() + 21);

  return {
    earliest: earliest.toISOString().slice(0, 10),
    latest: latest.toISOString().slice(0, 10),
  };
}
