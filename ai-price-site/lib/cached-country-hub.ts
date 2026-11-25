import { cache } from "react";
import { getCountryHubRows } from "./country-hubs";
import { getCountryHub } from "./country-hubs-data";
import { loadVerifiedPriceSource } from "./cached-verified-price-source";
import { fictionalHomepageSource, isHomepageFixtureEnabled } from "./test-fixtures/homepage";

// Share the same read (including failure) between metadata and the page render.
// Cross-request caching belongs to the shared all-country source, not each country.
export const loadCountryHub = cache(async (countryCode: string) => {
  if (isHomepageFixtureEnabled()) {
    const { prices, rates } = fictionalHomepageSource();
    return getCountryHubRows(prices, countryCode, rates);
  }
  return getCountryHub(countryCode, loadVerifiedPriceSource);
});
