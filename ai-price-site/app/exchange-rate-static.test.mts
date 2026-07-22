import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(rootDir, fileName), "utf8");
}

test("exchange-rate fallback never shows a hardcoded CNY estimate", () => {
  const exchangeRates = readProjectFile("lib/exchange-rates.ts");
  const pricingView = readProjectFile("components/PricingPlatformView.tsx");
  const pricingCopy = readProjectFile("lib/public-pricing-copy.ts");

  assert.match(exchangeRates, /const UNAVAILABLE_USD_CNY_RATE = 0;/);
  assert.match(pricingView, /const UNAVAILABLE_CNY_PER_USD = 0;/);
  assert.doesNotMatch(exchangeRates, /7\.25/);
  assert.doesNotMatch(pricingView, /7\.25/);
  assert.match(
    pricingView,
    /cnyDisabled = Boolean\(cnyExchangeRate\.isFallback \|\| cnyExchangeRate\.isStale\)/,
  );
  assert.match(pricingView, /getPublicPricingCopy\(locale\)\.pricing/);
  assert.match(pricingCopy, /人民币估算暂不可用：汇率待同步/);
  assert.match(pricingCopy, /人民币估算暂停：汇率同步已过期/);
  assert.match(pricingCopy, /CNY estimate unavailable: exchange-rate sync is pending/);
  assert.match(pricingCopy, /CNY estimate paused: exchange-rate sync is stale/);
});

test("exchange-rate freshness is stricter than the public 12-hour refresh window", () => {
  const exchangeRates = readProjectFile("lib/exchange-rates.ts");
  const cronRoute = readProjectFile("app/api/cron/exchange-rates/route.ts");
  const syncScript = readProjectFile("scripts/sync-exchange-rates.cjs");
  const localCheck = readProjectFile("scripts/check-local-env.cjs");
  const qualityCheck = readProjectFile("scripts/check-price-quality.cjs");
  const collector = readProjectFile("../geosub-backend/scripts/collect-app-store-prices.ps1");
  const linuxSync = readProjectFile("../geosub-backend/deploy/linux-arm64/run-exchange-rate-sync.sh");
  const postDeployCheck = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/post-deploy-check.sh",
  );
  const requiredQuotes =
    "AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR";

  assert.match(cronRoute, /recommendedSchedule:\s*"Every 12 hours"/);
  assert.match(exchangeRates, /const MAX_FRESH_RATE_AGE_HOURS = 18;/);
  assert.equal(requiredQuotes.split(",").length, 35);
  assert.ok(syncScript.includes(requiredQuotes));
  assert.ok(localCheck.includes(requiredQuotes));
  assert.ok(qualityCheck.includes(requiredQuotes));
  assert.ok(linuxSync.includes(requiredQuotes));
  assert.ok(postDeployCheck.includes(requiredQuotes));
  assert.match(linuxSync, /-QuoteCurrencies "\$QUOTE_CURRENCIES"/);
  assert.doesNotMatch(linuxSync, /-QuoteCurrencies "\$\{QUOTE_ARGS\[@\]\}"/);
  assert.match(
    readProjectFile("../geosub-backend/scripts/sync-exchange-rates.ps1"),
    /ForEach-Object \{ \$_ -split "," \}/,
  );
  assert.match(syncScript, /api\.frankfurter\.app\/latest/);
  assert.match(syncScript, /open\.er-api\.com\/v6\/latest/);
  assert.match(syncScript, /Frankfurter omitted/);
  assert.match(syncScript, /frankfurter\+open-er-api/);
  assert.match(syncScript, /upsert_exchange_rate/);
  assert.match(collector, /FROM latest_exchange_rates/);
  assert.match(collector, /SELECT DISTINCT ON \(quote_currency\)/);
  assert.match(collector, /jsonb_object_agg/);
  assert.match(collector, /fetched_at >= NOW\(\) - INTERVAL '18 hours'/);
  assert.match(collector, /Run the exchange-rate sync first/);
  assert.match(collector, /transientFailures/);
  assert.match(collector, /Temporary storefront failures must be retried/);
});
