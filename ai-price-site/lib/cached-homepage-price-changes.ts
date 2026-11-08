import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getHomepagePriceRecords } from "./price-records-data";
import { homepagePriceChanges } from "./homepage-price-changes";
import { PUBLIC_PRICING_CACHE_TAG } from "./public-pricing-cache";

const readChanges = unstable_cache(async () => {
  const result = await getHomepagePriceRecords();
  if (result.truncated) console.error("homepage-price-changes-read-limit");
  return homepagePriceChanges(result.records, result.now, result.truncated);
}, ["homepage-price-changes-v1"], { revalidate: 3600, tags: [PUBLIC_PRICING_CACHE_TAG] });

export const loadHomepagePriceChanges = cache(async () => {
  try {
    // Recheck the date window on cache hits too: stale-while-revalidate must not
    // leave a just-expired event on the homepage beyond its 30-day window.
    const cutoff = Date.now() - 30 * 86_400_000;
    return (await readChanges()).filter(event => Date.parse(event.observedAt) >= cutoff);
  } catch (error) {
    console.error("homepage-price-changes-read-failed", error instanceof Error ? error.name : "UnknownError");
    return [];
  }
});
