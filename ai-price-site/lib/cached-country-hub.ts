import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCountryHub } from "./country-hubs-data";
import { getPriceEvidencePreview } from "./price-evidence-preview";
import { PUBLIC_EXCHANGE_RATE_CACHE_TAG, PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "./public-pricing-cache";

// Share the same read (including failure) between metadata and the page render.
export const loadCountryHub = cache((code: string) => unstable_cache(
  () => getCountryHub(code),
  ["country-hub-v2", code, getPriceEvidencePreview()?.capturedAt || "public"],
  { revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS, tags: [PUBLIC_PRICING_CACHE_TAG, PUBLIC_EXCHANGE_RATE_CACHE_TAG] },
)());
