import "server-only";
import { loadVerifiedPriceSource } from "./cached-verified-price-source";
import { getCountryHubRows } from "./country-hubs.ts";

export async function getCountryHub(countryCode: string) {
  const { prices, rates } = await loadVerifiedPriceSource();
  return getCountryHubRows(prices, countryCode, rates);
}
