import "server-only";
import { readVerifiedPriceSource } from "./verified-price-source.ts";
import { getCountryHubRows } from "./country-hubs.ts";

// CLI checks use the uncached reader; Next callers inject the shared source cache.
export async function getCountryHub(countryCode: string, readSource = readVerifiedPriceSource) {
  const { prices, rates } = await readSource();
  return getCountryHubRows(prices, countryCode, rates);
}
