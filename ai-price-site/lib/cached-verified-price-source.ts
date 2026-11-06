import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { readVerifiedPriceSource } from "./verified-price-source";
import { getPriceEvidencePreview } from "./price-evidence-preview";
import { PUBLIC_EXCHANGE_RATE_CACHE_TAG, PUBLIC_PRICING_CACHE_TAG } from "./public-pricing-cache";

// One source for every country and the homepage. Keep request/preview state
// outside unstable_cache; both price and FX invalidation refresh this snapshot.
export const loadVerifiedPriceSource = cache(() => unstable_cache(
  readVerifiedPriceSource,
  ["verified-price-source-v1", getPriceEvidencePreview()?.capturedAt || "public"],
  { revalidate: 3600, tags: [PUBLIC_PRICING_CACHE_TAG, PUBLIC_EXCHANGE_RATE_CACHE_TAG] },
)());
