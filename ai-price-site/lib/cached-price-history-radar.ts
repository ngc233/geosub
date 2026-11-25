import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getHomepagePriceRecords } from "./price-records-data";
import { extractWindowRadarEvents } from "./public-map-views";
import { createHomepageChangesGuard, homepageChangesErrorCategory } from "./homepage-changes-resilience";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "./public-pricing-cache";
import { fictionalPriceHistoryRecords, isHomepageFixtureEnabled } from "./test-fixtures/homepage";

export const PRICE_HISTORY_RADAR_DAYS = 120;

const guardedRadarRead = createHomepageChangesGuard(
  async () => {
    const result = await getHomepagePriceRecords();
    if (result.truncated) console.error("price-history-radar-read-limit");
    const observedCodes = [
      ...new Set(result.records.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
    ].sort();
    const events = extractWindowRadarEvents(result.records, result.now, PRICE_HISTORY_RADAR_DAYS, 100, result.truncated);
    return { events, observedCodes };
  },
  (error) => console.error("price-history-radar-read-failed", homepageChangesErrorCategory(error)),
);

const readCachedRadar = unstable_cache(guardedRadarRead, ["price-history-global-radar-v2"], {
  revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
  tags: [PUBLIC_PRICING_CACHE_TAG],
});

export const loadPriceHistoryGlobalRadar = cache(async () => {
  if (isHomepageFixtureEnabled()) {
    const now = new Date();
    const records = fictionalPriceHistoryRecords(now);
    const observedCodes = [
      ...new Set(records.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
    ].sort();
    return {
      observedCodes,
      events: extractWindowRadarEvents(records, now, PRICE_HISTORY_RADAR_DAYS, 100, false),
    };
  }
  try {
    const cutoff = Date.now() - PRICE_HISTORY_RADAR_DAYS * 86_400_000;
    const data = await readCachedRadar();
    return {
      observedCodes: data.observedCodes,
      events: data.events.filter((event) => Date.parse(event.observedAt) >= cutoff),
    };
  } catch {
    return { observedCodes: [], events: [] };
  }
});
