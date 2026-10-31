import { createHash } from "node:crypto";

export type PriceObservationRecord = {
  id: string; productSlug: string; productName: string; category: "ai" | "streaming";
  planSlug: string; planName: string; countryCode: string; sourceId: string | null;
  sourceUrl: string | null; observedAt: string; platform: string; priceType: string;
  amount: number; currency: string; status: string; confidence: number;
  anomaly: boolean; snapshot: unknown; itemName: string | null; originalPriceText: string | null;
  reviewReason?: string | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, max = 250) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}
export function isObservationId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function getAppStoreSourceUrl(value: string | null, countryCode: string) {
  try {
    const url = new URL(value || "");
    if (url.protocol !== "https:" || url.hostname !== "apps.apple.com" || url.username || url.password
      || url.port || !url.pathname.toLowerCase().startsWith(`/${countryCode.toLowerCase()}/`)) return null;
    url.search = ""; url.hash = "";
    return url.toString();
  } catch { return null; }
}
export function isPublicObservation(record: PriceObservationRecord) {
  return isObservationId(record.id) && record.status === "approved" && !record.anomaly
    && record.confidence >= 80 && record.platform === "ios" && record.priceType === "list_price"
    && Number.isFinite(record.amount) && record.amount > 0 && /^[A-Z]{3}$/.test(record.currency)
    && /^[A-Z]{2}$/.test(record.countryCode) && Boolean(getAppStoreSourceUrl(record.sourceUrl, record.countryCode))
    && Number.isFinite(Date.parse(record.observedAt));
}

export function getPublicPriceSnapshot(record: PriceObservationRecord) {
  if (!isPublicObservation(record)) return null;
  const raw = object(record.snapshot);
  if (text(raw.country).toUpperCase() !== record.countryCode || text(raw.planSpecSlug) !== record.planSlug) return null;
  const items = Array.isArray(raw.inAppPurchases) ? raw.inAppPurchases : [];
  const projectedItems = items.slice(0, 200).flatMap(item => {
    const row = object(item);
    const name = text(row.Name ?? row.name);
    const priceText = text(row.PriceText ?? row.priceText);
    if (!name || !priceText) return [];
    return [{ name, priceText, selected: name === record.itemName && priceText === record.originalPriceText }];
  });
  if (!projectedItems.length) return null;
  const billingCycle = text(raw.billingCycle);
  const body = {
    id: record.id, productSlug: record.productSlug, productName: record.productName,
    category: record.category, planSlug: record.planSlug, planName: record.planName,
    countryCode: record.countryCode, sourceUrl: getAppStoreSourceUrl(record.sourceUrl, record.countryCode)!,
    observedAt: new Date(record.observedAt).toISOString(), amount: record.amount, currency: record.currency,
    billingCycle: ["monthly", "yearly", "weekly", "quarterly", "one_time", "lifetime"].includes(billingCycle) ? billingCycle : null,
    items: projectedItems, truncated: items.length > 200,
  };
  // Only the allowlisted historical source fields contribute; review annotations
  // and other private payload fields never leave the server.
  return { ...body, contentHash: createHash("sha256").update(JSON.stringify({
    id: body.id, countryCode: body.countryCode, planSlug: body.planSlug,
    sourceUrl: body.sourceUrl, observedAt: body.observedAt, amount: body.amount,
    currency: body.currency, billingCycle: body.billingCycle, items: body.items, truncated: body.truncated,
  })).digest("hex") };
}

export type PriceChange = {
  before: NonNullable<ReturnType<typeof getPublicPriceSnapshot>>;
  after: NonNullable<ReturnType<typeof getPublicPriceSnapshot>>;
  direction: "increase" | "decrease"; percent: number;
};

export function getPriceChanges(records: PriceObservationRecord[]): PriceChange[] {
  const streams = new Map<string, PriceObservationRecord[]>();
  for (const row of records) {
    const key = [row.productSlug, row.planSlug, row.countryCode, row.platform].join(":");
    const stream = streams.get(key) || [];
    stream.push(row);
    streams.set(key, stream);
  }
  const events: PriceChange[] = [];
  for (const stream of streams.values()) {
    stream.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.id.localeCompare(b.id));
    let previous: { record: PriceObservationRecord; snapshot: NonNullable<ReturnType<typeof getPublicPriceSnapshot>>; lastSeenAt: number } | null = null;
    for (let index = 0; index < stream.length; index++) {
      const row = stream[index];
      const snapshot = getPublicPriceSnapshot(row);
      const next = stream[index + 1];
      // Conflicting observations at the same instant cannot establish an order.
      const simultaneous = Boolean((next && next.observedAt === row.observedAt)
        || (index > 0 && stream[index - 1].observedAt === row.observedAt));
      // The existing reviewer ignores routine same-price reads. They may keep
      // an already-approved baseline continuous, but never establish a new
      // baseline or substantiate a different amount by themselves.
      if (previous && row.status === "ignored" && row.reviewReason === "superseded_by_published_price" && !simultaneous) {
        const raw = object(row.snapshot);
        const time = Date.parse(row.observedAt);
        const unchanged = !row.anomaly && row.confidence >= 80 && row.priceType === "list_price"
          && row.sourceId === previous.record.sourceId && row.currency === previous.snapshot.currency
          && Math.round(row.amount * 100) === Math.round(previous.snapshot.amount * 100)
          && text(raw.billingCycle) === previous.snapshot.billingCycle && text(raw.planSpecSlug) === row.planSlug
          && text(raw.country).toUpperCase() === row.countryCode
          && Array.isArray(raw.inAppPurchases) && raw.inAppPurchases.length > 0
          && Boolean(getAppStoreSourceUrl(row.sourceUrl, row.countryCode))
          && time > previous.lastSeenAt && time - previous.lastSeenAt <= 14 * 86_400_000;
        if (unchanged) { previous.lastSeenAt = time; continue; }
      }
      if (!snapshot?.billingCycle || !row.sourceId || simultaneous) { previous = null; continue; }
      if (previous) {
        const before = previous.snapshot;
        const sameIdentity = previous.record.sourceId === row.sourceId && before.currency === snapshot.currency
          && before.billingCycle === snapshot.billingCycle && row.priceType === previous.record.priceType;
        const gap = Date.parse(snapshot.observedAt) - previous.lastSeenAt;
        if (sameIdentity && gap > 0 && gap <= 14 * 86_400_000 && Math.round(before.amount * 100) !== Math.round(snapshot.amount * 100)) {
          events.push({ before, after: snapshot, direction: snapshot.amount > before.amount ? "increase" : "decrease",
            percent: Math.round((snapshot.amount / before.amount - 1) * 1000) / 10 });
        }
      }
      previous = { record: row, snapshot, lastSeenAt: Date.parse(snapshot.observedAt) };
    }
  }
  return events.sort((a, b) => Date.parse(b.after.observedAt) - Date.parse(a.after.observedAt));
}

// Cache only fields rendered by history cards. Full item lists remain available
// from the individual snapshot reader, without exceeding Next's cache limit.
export function getPriceHistorySummary(records: PriceObservationRecord[]) {
  const summarize = (snapshot: NonNullable<ReturnType<typeof getPublicPriceSnapshot>>) => ({
    id: snapshot.id, planName: snapshot.planName, countryCode: snapshot.countryCode,
    observedAt: snapshot.observedAt, amount: snapshot.amount, currency: snapshot.currency,
    billingCycle: snapshot.billingCycle,
  });
  const changes = getPriceChanges(records);
  const snapshots = [];
  for (const record of records) {
    const snapshot = getPublicPriceSnapshot(record);
    if (snapshot) snapshots.push(summarize(snapshot));
    if (snapshots.length === 12) break;
  }
  const observedTimes = records.map(row => row.observedAt).sort();
  return {
    coverage: {
      recordCount: records.length,
      observedDays: new Set(records.map(row => row.observedAt.slice(0, 10))).size,
      countryCount: new Set(records.map(row => row.countryCode)).size,
      firstObservedAt: observedTimes[0] || null,
      lastObservedAt: observedTimes[observedTimes.length - 1] || null,
    },
    eventCount: changes.length,
    events: changes.slice(0, 100).map(event => ({
      before: summarize(event.before), after: summarize(event.after),
      direction: event.direction, percent: event.percent,
    })),
    snapshots,
  };
}
