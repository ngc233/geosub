import { unstable_cache } from "next/cache";
import { getLatestUsdExchangeRates } from "./exchange-rates";
import { supportedDisplayCurrencies } from "./display-currency";
import { PUBLIC_EXCHANGE_RATE_CACHE_TAG, PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS } from "./public-pricing-cache";

export const getCachedPublicDisplayRates = unstable_cache(
  () => getLatestUsdExchangeRates(supportedDisplayCurrencies),
  ["public-pricing-exchange-rates"],
  { revalidate: PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS, tags: [PUBLIC_EXCHANGE_RATE_CACHE_TAG] },
);
