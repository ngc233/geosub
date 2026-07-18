#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const rootDir = process.cwd();

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false, quiet: true });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const baseCurrency = normalizeCurrency(process.env.GEOSUB_FX_BASE || "USD");
const defaultQuoteCurrencies =
  "AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR";
const quoteCurrencies = `${defaultQuoteCurrencies},${process.env.GEOSUB_FX_QUOTES || ""}`
  .split(",")
  .map(normalizeCurrency)
  .filter((value, index, values) => value && value !== baseCurrency && values.indexOf(value) === index);

function normalizeCurrency(value) {
  return String(value || "").trim().toUpperCase();
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function fetchFrankfurterRates(base, quotes) {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${quotes
    .map(encodeURIComponent)
    .join(",")}`;
  const payload = await fetchJson(url);

  return {
    source: "frankfurter",
    requestedUrl: url,
    rateDate: payload.date || new Date().toISOString().slice(0, 10),
    rates: payload.rates || {},
    payload,
  };
}

async function fetchOpenErApiRates(base) {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const payload = await fetchJson(url);

  return {
    source: "open-er-api",
    requestedUrl: url,
    rateDate: formatDate(payload.time_last_update_utc),
    rates: payload.rates || {},
    payload,
  };
}

async function getRates(base, quotes) {
  let primary;
  try {
    primary = await fetchFrankfurterRates(base, quotes);
  } catch (error) {
    console.warn(`WARN  Frankfurter lookup failed: ${error.message}`);
    console.warn("WARN  Falling back to open.er-api.");
    return fetchOpenErApiRates(base);
  }

  const missingQuotes = quotes.filter((quote) => {
    const rate = Number(primary.rates[quote]);
    return !Number.isFinite(rate) || rate <= 0;
  });
  if (missingQuotes.length === 0) {
    return primary;
  }

  console.warn(
    `WARN  Frankfurter omitted ${missingQuotes.length} quote currencies; filling them from open.er-api.`,
  );
  const fallback = await fetchOpenErApiRates(base);

  return {
    source: "frankfurter+open-er-api",
    requestedUrl: `${primary.requestedUrl} | ${fallback.requestedUrl}`,
    rateDate: fallback.rateDate || primary.rateDate,
    rates: { ...primary.rates, ...fallback.rates },
    payload: {
      primary: primary.payload,
      fallback: fallback.payload,
      fallbackQuotes: missingQuotes,
    },
  };
}

async function upsertRate(client, { base, quote, rate, rateDate, source, providerPayload }) {
  await client.query(
    `
      SELECT upsert_exchange_rate(
        $1,
        $2,
        $3,
        $4::date,
        $5,
        NOW(),
        NULL,
        $6::jsonb
      )
    `,
    [base, quote, rate, rateDate, source, JSON.stringify(providerPayload)],
  );
}

async function main() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to sync exchange rates.");
  }

  if (quoteCurrencies.length === 0) {
    throw new Error("At least one quote currency different from the base is required.");
  }

  const result = await getRates(baseCurrency, quoteCurrencies);
  const client = new Client({ connectionString: databaseUrl });
  const synced = [];

  await client.connect();

  try {
    for (const quote of quoteCurrencies) {
      const rate = Number(result.rates[quote]);
      if (!Number.isFinite(rate) || rate <= 0) {
        console.warn(`WARN  Missing positive ${baseCurrency}/${quote} rate from ${result.source}.`);
        continue;
      }

      await upsertRate(client, {
        base: baseCurrency,
        quote,
        rate,
        rateDate: result.rateDate,
        source: result.source,
        providerPayload: {
          source: result.source,
          requestedUrl: result.requestedUrl,
          rateDate: result.rateDate,
          quote,
          rate,
        },
      });

      synced.push({ quote, rate });
      console.log(`OK    ${baseCurrency}/${quote} ${rate.toFixed(6)} (${result.rateDate})`);
    }
  } finally {
    await client.end();
  }

  if (synced.length !== quoteCurrencies.length) {
    throw new Error(`Exchange-rate sync incomplete: ${synced.length}/${quoteCurrencies.length}.`);
  }

  console.log(`Exchange-rate sync complete via ${result.source}.`);
}

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exitCode = 1;
});
