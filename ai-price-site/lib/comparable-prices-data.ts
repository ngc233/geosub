import "server-only";
import { cache } from "react";
import { loadVerifiedPriceSource } from "./cached-verified-price-source";
import { getComparablePriceRows } from "./country-hubs.ts";

// No second query or result cache: recheck price/FX age at projection time,
// including when the shared one-hour snapshot is served from cache.
export const loadComparablePrices = cache(async () => {
  const { prices, rates } = await loadVerifiedPriceSource();
  return getComparablePriceRows(prices, rates);
});
