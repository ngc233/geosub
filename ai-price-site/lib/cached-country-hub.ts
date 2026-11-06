import { cache } from "react";
import { getCountryHub } from "./country-hubs-data";
import { loadVerifiedPriceSource } from "./cached-verified-price-source";

// Share the same read (including failure) between metadata and the page render.
// Cross-request caching belongs to the shared all-country source, not each country.
export const loadCountryHub = cache((countryCode: string) => getCountryHub(countryCode, loadVerifiedPriceSource));
