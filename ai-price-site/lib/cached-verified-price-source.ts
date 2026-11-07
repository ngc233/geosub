import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { readVerifiedPriceSource } from "./verified-price-source";
import { packVerifiedPriceSource, unpackVerifiedPriceSource } from "./verified-price-cache.ts";
import { getPriceEvidencePreview } from "./price-evidence-preview";
import { PUBLIC_EXCHANGE_RATE_CACHE_TAG, PUBLIC_PRICING_CACHE_TAG } from "./public-pricing-cache";

// One source for every country and the homepage. Keep request/preview state
// outside unstable_cache; both price and FX invalidation refresh this snapshot.
export const loadVerifiedPriceSource = cache(async () => unpackVerifiedPriceSource(await unstable_cache(
  async () => packVerifiedPriceSource(await readVerifiedPriceSource()),
  ["verified-price-source-v3-display-currencies", getPriceEvidencePreview()?.capturedAt || "public"],
  { revalidate: 3600, tags: [PUBLIC_PRICING_CACHE_TAG, PUBLIC_EXCHANGE_RATE_CACHE_TAG] },
)()));
