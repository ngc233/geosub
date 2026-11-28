#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendDir, "..");
const planSpecsPath = path.join(backendDir, "data", "product-plan-specs.json");
const rendererPath = path.join(__dirname, "render-app-store-prices.mjs");

const DEFAULT_COUNTRIES = [
  "US", "CA", "MX", "BR", "AR", "CL", "CO",
  "GB", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "CH", "PL", "TR",
  "JP", "KR", "TW", "SG", "MY", "TH", "ID", "PH", "VN", "IN", "PK",
  "AU", "NZ", "AE", "SA", "IL", "ZA", "EG", "NG", "KE",
];

const DEFAULT_CURRENCY_BY_COUNTRY = {
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP",
  GB: "GBP", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  SE: "SEK", NO: "NOK", DK: "DKK", CH: "CHF", PL: "PLN", TR: "TRY",
  JP: "JPY", KR: "KRW", TW: "TWD", SG: "SGD", MY: "MYR", TH: "THB",
  ID: "IDR", PH: "PHP", VN: "VND", IN: "INR", PK: "PKR",
  AU: "AUD", NZ: "NZD", AE: "AED", SA: "SAR", IL: "ILS", ZA: "ZAR",
  EG: "EGP", NG: "NGN", KE: "KES",
};

const DEFAULT_USER_AGENT =
  "GeoSubPriceResearch/2.8 (+https://geosub.org/data-sources; contact: https://geosub.org/zh/contact)";

export function parseArgs(argv) {
  const map = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key?.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      map.set(key.slice(2), next);
      i += 1;
    } else {
      map.set(key.slice(2), "true");
    }
  }
  return map;
}

export function normalizePlanMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replaceAll("+", " plus ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parsePriceNumber(priceText) {
  if (!priceText) return null;
  let normalized = String(priceText)
    .replace(/&nbsp;/gi, " ")
    .replace(/[\u00A0\u202F]/g, " ");
  normalized = normalized.replace(/(?<=[0-9])[^0-9.,]+(?=[0-9])/g, " ");
  const matches = normalized.match(/[0-9](?:[0-9\s.,]*[0-9])?/g) || [];
  const numberTextRaw = matches.sort((a, b) => b.length - a.length)[0]?.trim();
  if (!numberTextRaw) return null;

  const lower = normalized.toLowerCase();
  let multiplier = 1;
  if (lower.includes("ribu")) multiplier = 1000;
  else if (lower.includes("juta")) multiplier = 1000000;

  let numberText = numberTextRaw.replace(/\s+/g, " ");
  const lastDot = numberText.lastIndexOf(".");
  const lastComma = numberText.lastIndexOf(",");
  let decimalSeparator = null;

  if (multiplier > 1 && lastComma >= 0 && lastDot < 0) decimalSeparator = ",";
  else if (multiplier > 1 && lastDot >= 0 && lastComma < 0) decimalSeparator = ".";
  else if (lastDot >= 0 && lastComma >= 0) decimalSeparator = lastDot > lastComma ? "." : ",";
  else if (lastDot >= 0) {
    const digitsAfter = numberText.length - lastDot - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) decimalSeparator = ".";
  } else if (lastComma >= 0) {
    const digitsAfter = numberText.length - lastComma - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) decimalSeparator = ",";
  }

  if (decimalSeparator === null) {
    numberText = numberText.replace(/[ .,]/g, "");
  } else if (decimalSeparator === ".") {
    numberText = numberText.replace(/[ ,]/g, "");
  } else {
    numberText = numberText.replace(/[ .]/g, "").replace(",", ".");
  }

  const parsed = Number(numberText);
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

export function getObservedCurrency(priceText, fallbackCurrency) {
  const upper = String(priceText || "").replace(/&nbsp;/gi, " ").toUpperCase();
  if (/USD|US\s?\$/.test(upper)) return "USD";
  if (/\bEUR\b|€/.test(upper)) return "EUR";
  if (/\bGBP\b|£/.test(upper)) return "GBP";
  if (/\bJPY\b|¥|￥/.test(upper) && fallbackCurrency !== "CNY") return "JPY";
  if (/₹|\bINR\b/.test(upper)) return "INR";
  if (/₺|\bTRY\b/.test(upper)) return "TRY";
  if (/₩|\bKRW\b/.test(upper)) return "KRW";
  if (/₦|\bNGN\b/.test(upper)) return "NGN";
  if (/₫|\bVND\b/.test(upper)) return "VND";
  if (/₱|\bPHP\b/.test(upper)) return "PHP";
  if (/฿|\bTHB\b/.test(upper)) return "THB";
  if (/R\$|\bBRL\b/.test(upper)) return "BRL";
  if (/S\$|\bSGD\b/.test(upper)) return "SGD";
  if (/A\$|\bAUD\b/.test(upper)) return "AUD";
  if (/C\$|\bCAD\b/.test(upper)) return "CAD";
  if (/CHF/.test(upper)) return "CHF";
  return (fallbackCurrency || "USD").toUpperCase();
}

export function resolvePlanSpec(productSpec, itemName) {
  if (!productSpec || !Array.isArray(productSpec.plans)) return null;
  const normalizedItem = normalizePlanMatchText(itemName);
  if (!normalizedItem) return null;

  for (const plan of productSpec.plans) {
    for (const alias of plan.aliases || []) {
      if (normalizePlanMatchText(alias) === normalizedItem) {
        return plan;
      }
    }
  }
  return null;
}

export function evaluateObservationAnomaly({
  countryCurrency,
  observedCurrency,
  convertedUsd,
  originalPriceText,
  planSpec,
}) {
  const reasons = [];
  if (planSpec?.review_only === true) {
    reasons.push("This new plan requires manual identity and regional price review before publication.");
  }
  if (Number.isFinite(convertedUsd) && convertedUsd < 1) {
    reasons.push("Converted App Store price is below 1 USD. Check whether the price text or currency was parsed incorrectly.");
  }
  const upperText = String(originalPriceText || "").toUpperCase();
  if (/USD|US\s?\$/.test(upperText) && observedCurrency !== "USD") {
    reasons.push(`Original App Store price text contains USD, but the observation currency is ${observedCurrency}.`);
  }
  if (observedCurrency === "USD" && countryCurrency !== "USD" && !/USD|US\s?\$/.test(upperText)) {
    reasons.push("Parsed currency is USD for a non-USD storefront, but the original price text did not explicitly contain USD.");
  }
  if (
    Number.isFinite(convertedUsd) &&
    Number.isFinite(planSpec?.expected_monthly_usd_min) &&
    Number.isFinite(planSpec?.expected_monthly_usd_max)
  ) {
    const tol = Number.isFinite(planSpec.expected_range_tolerance_percent)
      ? Math.max(0, planSpec.expected_range_tolerance_percent) / 100
      : 0.03;
    const min = Math.max(0, planSpec.expected_monthly_usd_min * (1 - tol));
    const max = planSpec.expected_monthly_usd_max * (1 + tol);
    if (convertedUsd < min) {
      reasons.push(`Converted App Store price is below the expected range for ${planSpec.slug}.`);
    }
    if (convertedUsd > max) {
      reasons.push(`Converted App Store price is above the expected range for ${planSpec.slug}.`);
    }
  }
  return { flag: reasons.length > 0, reason: reasons.length > 0 ? reasons.join(" ") : null };
}

export function extractIapItemsFromHtml(html) {
  const results = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const text = match[1];
    if (!text.includes("In-App Purchases") && !text.includes("textPairs")) continue;
    try {
      const json = JSON.parse(text.trim());
      const visit = (node) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node.items)) {
          for (const item of node.items) {
            if (item?.$kind === "textPair" && item.leadingText && item.trailingText) {
              results.push({ name: String(item.leadingText).trim(), priceText: String(item.trailingText).trim() });
            } else if (Array.isArray(item?.textPairs)) {
              for (const pair of item.textPairs) {
                if (Array.isArray(pair) && pair.length >= 2) {
                  results.push({ name: String(pair[0]).trim(), priceText: String(pair[1]).trim() });
                }
              }
            }
          }
        }
        for (const child of Array.isArray(node) ? node : Object.values(node)) {
          visit(child);
        }
      };
      visit(json);
    } catch {
      // Non-JSON inline scripts are expected.
    }
  }
  return results;
}

function getAppStoreUrl(countryCode, appId, configuredUrl) {
  const cc = countryCode.toLowerCase();
  let base = `https://apps.apple.com/${cc}/app/id${appId}`;
  if (configuredUrl) {
    const normalized = /apps\.apple\.com\/[a-z]{2}\//i.test(configuredUrl)
      ? configuredUrl.replace(/apps\.apple\.com\/[a-z]{2}\//i, `apps.apple.com/${cc}/`)
      : configuredUrl.replace(/apps\.apple\.com\//i, `apps.apple.com/${cc}/`);
    if (new RegExp(`/id${appId}(\\?|$)`).test(normalized)) {
      base = normalized;
    }
  }
  const url = new URL(base);
  if (!url.searchParams.has("l")) {
    url.searchParams.set("l", "en-US");
  }
  return url.toString();
}

async function fetchStorefront(countryCode, appId, configuredUrl, chromePath, userAgent) {
  const url = getAppStoreUrl(countryCode, appId, configuredUrl);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(25000),
    });
    const html = await res.text();
    const items = extractIapItemsFromHtml(html);
    if (res.status === 200 && items.length > 0) {
      return {
        ok: true,
        url,
        finalUrl: res.url || url,
        status: res.status,
        items,
        parserVersion: "app-store-html-iap-v1",
        capturedAt: new Date().toISOString(),
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        notAvailable: true,
        url,
        finalUrl: res.url || url,
        status: 404,
        items: [],
        parserVersion: "app-store-html-iap-v1",
        capturedAt: new Date().toISOString(),
      };
    }
  } catch {
    // Fall through to Playwright renderer if available.
  }

  if (existsSync(rendererPath)) {
    const args = [rendererPath, "--country", countryCode, "--app-id", appId, "--url", url];
    if (chromePath) args.push("--chrome-path", chromePath);
    const rendered = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 120000 });
    if (rendered.status === 0 && rendered.stdout) {
      try {
        const payload = JSON.parse(rendered.stdout);
        return {
          ok: Boolean(payload.ok),
          notAvailable: payload.status === 404,
          url: payload.url || url,
          finalUrl: payload.finalUrl || url,
          status: payload.status ?? null,
          items: Array.isArray(payload.items) ? payload.items : [],
          parserVersion: `app-store-rendered-${payload.parserSource || "dom"}`,
          capturedAt: payload.capturedAt || new Date().toISOString(),
        };
      } catch {
        // Ignore parse failure and fall back to transient failure.
      }
    }
  }

  return {
    ok: false,
    transient: true,
    url,
    finalUrl: url,
    status: null,
    items: [],
    parserVersion: "app-store-html-iap-v1",
    capturedAt: new Date().toISOString(),
  };
}

function loadEnvFile(filePath) {
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function openDbClientIfNeeded(dryRun) {
  loadEnvFile(path.join(repoRoot, "ai-price-site", ".env.local"));
  loadEnvFile(path.join(repoRoot, "ai-price-site", ".env"));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    if (dryRun) return null;
    throw new Error("DATABASE_URL is required when running without --dry-run.");
  }
  const frontendDir = process.env.GEOSUB_FRONTEND_DIR || path.join(repoRoot, "ai-price-site");
  const requireFromSite = createRequire(path.join(frontendDir, "package.json"));
  const { Client } = requireFromSite("pg");
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 });
  await client.connect();
  return client;
}

async function loadFxRates(client, currencies) {
  const rates = { USD: 1 };
  let rateDate = new Date().toISOString().slice(0, 10);
  if (client) {
    const res = await client.query(
      `SELECT DISTINCT ON (quote_currency) quote_currency, rate::float8 AS rate, rate_date::text AS rate_date
       FROM exchange_rates
       WHERE base_currency = 'USD' AND quote_currency = ANY($1::text[])
         AND status = 'active'
       ORDER BY quote_currency, is_latest DESC, rate_date DESC`,
      [currencies],
    );
    for (const row of res.rows) {
      rates[row.quote_currency.toUpperCase()] = Number(row.rate);
      if (row.rate_date) rateDate = row.rate_date.slice(0, 10);
    }
    if (Object.keys(rates).length > 1 || currencies.every((c) => c === "USD")) {
      return { rates, rateDate };
    }
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD", {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      Object.assign(rates, data.rates || {});
      if (data.date) rateDate = data.date;
    }
  } catch {
    // Dry-run can still report local prices if FX endpoint is unreachable.
  }
  return { rates, rateDate };
}

const CONSUMABLE_IAP_RE = /\b(coins?|credits?|tokens?|gems?|diamonds?|top[- ]?up|pack|bundle\s*\d+|points?|stars?|hearts?|energy|boosts?)\b/i;

export function recordUnmatchedPlanCandidate(unmatchedMap, { name, country, priceText }) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName || CONSUMABLE_IAP_RE.test(trimmedName)) return;
  const key = normalizePlanMatchText(trimmedName);
  if (!key) return;
  let entry = unmatchedMap.get(key);
  if (!entry) {
    entry = { name: trimmedName, countries: new Set(), sample_price: String(priceText || "").trim(), count: 0 };
    unmatchedMap.set(key, entry);
  }
  entry.count += 1;
  if (country) entry.countries.add(String(country).toUpperCase());
}

export function summarizeUnmatchedPlanCandidates(unmatchedMap, limit = 25) {
  return [...unmatchedMap.values()]
    .sort((a, b) => b.countries.size - a.countries.size || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => ({
      name: entry.name,
      countries: [...entry.countries].sort(),
      country_count: entry.countries.size,
      sample_price: entry.sample_price,
      count: entry.count,
    }));
}

function selectBestItemPerPlan(items, productSpec, countryCurrency) {
  const buckets = new Map();
  const unmatchedItems = [];
  let matchedCount = 0;
  let ignoredCount = 0;

  for (const item of items) {
    const planSpec = resolvePlanSpec(productSpec, item.name);
    if (!planSpec) {
      ignoredCount += 1;
      unmatchedItems.push(item);
      continue;
    }
    const rawPrice = parsePriceNumber(item.priceText);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
      ignoredCount += 1;
      continue;
    }
    matchedCount += 1;
    const currency = getObservedCurrency(item.priceText, countryCurrency);
    const list = buckets.get(planSpec.slug) || [];
    list.push({ item, planSpec, rawPrice, currency });
    buckets.set(planSpec.slug, list);
  }

  const selected = new Map();
  for (const [planSlug, candidates] of buckets.entries()) {
    const counts = new Map();
    for (const c of candidates) {
      const key = `${c.currency}:${c.rawPrice}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    candidates.sort((a, b) => {
      const ca = counts.get(`${a.currency}:${a.rawPrice}`) || 0;
      const cb = counts.get(`${b.currency}:${b.rawPrice}`) || 0;
      if (cb !== ca) return cb - ca;
      return a.rawPrice - b.rawPrice;
    });
    selected.set(planSlug, candidates[0]);
  }
  return { selected, matchedCount, ignoredCount, unmatchedItems };
}

async function main() {
  if (process.env.GEOSUB_APP_STORE_COLLECTION_ENABLED === "false") {
    throw new Error("App Store collection is disabled by GEOSUB_APP_STORE_COLLECTION_ENABLED.");
  }

  const args = parseArgs(process.argv);
  const productSlug = args.get("product-slug");
  if (!productSlug) {
    throw new Error("--product-slug is required.");
  }

  const dryRun = args.get("dry-run") === "true";
  const force = args.get("force") === "true";
  const chromePath = args.get("chrome-path") || process.env.CHROME_PATH || "";
  const userAgent = process.env.GEOSUB_APP_STORE_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
  const delayMs = Math.min(10000, Math.max(250, Number(process.env.GEOSUB_APP_STORE_REQUEST_DELAY_MS || 500)));

  const planSpecs = JSON.parse(readFileSync(planSpecsPath, "utf8"));
  const productSpec = planSpecs[productSlug];
  if (!productSpec || productSpec.exact_plan_aliases !== true) {
    throw new Error(
      `Product '${productSlug}' requires a maintained exact-alias spec in data/product-plan-specs.json before .mjs App Store collection.`,
    );
  }

  const client = await openDbClientIfNeeded(dryRun);
  let contextData = null;
  let sourceId = null;

  try {
    if (client) {
      const prodRes = await client.query(
        "SELECT id, slug, name, category::text AS category, status::text AS status FROM products WHERE slug = $1",
        [productSlug],
      );
      if (prodRes.rowCount === 0) {
        throw new Error(`Product '${productSlug}' not found in database.`);
      }
      const product = prodRes.rows[0];
      const plansRes = await client.query(
        "SELECT id, slug, name FROM plans WHERE product_id = $1",
        [product.id],
      );
      const countriesRes = await client.query(
        "SELECT id, code, currency FROM countries",
      );
      const srcRes = await client.query(
        `INSERT INTO price_sources (
           id, source_key, name, source_level, type, provider, base_url,
           requires_javascript, requires_account, requires_geo, terms_risk,
           reliability_score, status, created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), 'apple-app-store', 'Apple App Store', 'A'::source_level,
           'app_store'::price_source_type, 'Apple', 'https://apps.apple.com/',
           FALSE, FALSE, TRUE, 'low'::risk_level, 88, 'active'::source_status, NOW(), NOW()
         )
         ON CONFLICT (source_key) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
      );
      sourceId = srcRes.rows[0].id;
      contextData = {
        product,
        plansBySlug: new Map(plansRes.rows.map((r) => [r.slug, r])),
        countriesByCode: new Map(countriesRes.rows.map((r) => [r.code.toUpperCase(), r])),
      };
    }

    const appId = args.get("app-id") || String(productSpec.app_store_id || "");
    if (!/^\d+$/.test(appId)) {
      throw new Error(`App Store app id is required for '${productSlug}'.`);
    }
    const configuredUrl = args.get("app-store-url") || productSpec.evidence_url || `https://apps.apple.com/us/app/id${appId}`;
    console.log(`Using App Store app id ${appId} for ${productSlug}.`);

    const excluded = new Set(
      (args.get("excluded-country-codes") || "CN,HK")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    );

    const requestedRaw = (args.get("country-codes") || "DEFAULT")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    let countryCodes;
    if (requestedRaw.includes("ALL") || requestedRaw.includes("*")) {
      countryCodes = contextData
        ? [...contextData.countriesByCode.keys()].filter((c) => !excluded.has(c))
        : DEFAULT_COUNTRIES.filter((c) => !excluded.has(c));
    } else if (requestedRaw.includes("DEFAULT")) {
      countryCodes = DEFAULT_COUNTRIES.filter((c) => !excluded.has(c));
    } else {
      countryCodes = requestedRaw.filter((c) => !excluded.has(c));
    }

    const currenciesNeeded = [
      ...new Set(
        countryCodes.map(
          (c) => contextData?.countriesByCode.get(c)?.currency?.toUpperCase() || DEFAULT_CURRENCY_BY_COUNTRY[c] || "USD",
        ),
      ),
    ];
    const fx = await loadFxRates(client, currenciesNeeded);

    const summary = {
      inserted: 0,
      skipped: 0,
      dry_run: 0,
      missing: 0,
      confirmed_storefronts: 0,
      transient_failures: 0,
      transient_country_codes: [],
    };
    const unmatchedCandidates = new Map();

    const cacheDir = process.env.GEOSUB_APP_STORE_CACHE_DIR || path.join(os.tmpdir(), "geosub-app-store-cache");
    mkdirSync(cacheDir, { recursive: true });

    for (let idx = 0; idx < countryCodes.length; idx += 1) {
      const code = countryCodes[idx];
      if (idx > 0) await new Promise((r) => setTimeout(r, delayMs));

      const countryRow = contextData?.countriesByCode.get(code);
      const countryCurrency = (countryRow?.currency || DEFAULT_CURRENCY_BY_COUNTRY[code] || "USD").toUpperCase();
      const page = await fetchStorefront(code, appId, configuredUrl, chromePath, userAgent);

      if (page.transient) {
        summary.transient_failures += 1;
        summary.transient_country_codes.push(code);
        continue;
      }
      if (page.notAvailable) {
        summary.missing += 1;
        if (client && countryRow && !dryRun) {
          await client.query(
            `INSERT INTO app_store_availability_checks
              (id, product_id, source_id, country_id, billing_platform, status, app_store_id, storefront, source_url, final_url, http_status, item_count, subscription_item_count, ignored_item_count, reason, checked_at, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'ios'::billing_platform, 'not_available', $4, $5, $6, $7, $8, 0, 0, 0, 'App Store returned HTTP 404 for storefront.', NOW(), NOW(), NOW())
             ON CONFLICT (product_id, country_id, billing_platform) DO UPDATE
             SET source_id = EXCLUDED.source_id, status = EXCLUDED.status, app_store_id = EXCLUDED.app_store_id, http_status = EXCLUDED.http_status, reason = EXCLUDED.reason, checked_at = NOW(), updated_at = NOW()`,
            [contextData.product.id, sourceId, countryRow.id, appId, code, page.url, page.finalUrl, page.status],
          );
        }
        continue;
      }

      summary.confirmed_storefronts += 1;
      const { selected, matchedCount, ignoredCount, unmatchedItems } = selectBestItemPerPlan(page.items, productSpec, countryCurrency);
      for (const item of unmatchedItems) {
        recordUnmatchedPlanCandidate(unmatchedCandidates, { name: item.name, country: code, priceText: item.priceText });
      }
      const availabilityStatus =
        page.items.length === 0
          ? "available_no_iap"
          : matchedCount === 0
            ? "available_unmatched_items"
            : "available_with_prices";

      if (client && countryRow && !dryRun) {
        await client.query(
          `INSERT INTO app_store_availability_checks
            (id, product_id, source_id, country_id, billing_platform, status, app_store_id, storefront, source_url, final_url, http_status, item_count, subscription_item_count, ignored_item_count, reason, checked_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'ios'::billing_platform, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
           ON CONFLICT (product_id, country_id, billing_platform) DO UPDATE
           SET source_id = EXCLUDED.source_id, status = EXCLUDED.status, app_store_id = EXCLUDED.app_store_id, http_status = EXCLUDED.http_status, item_count = EXCLUDED.item_count, subscription_item_count = EXCLUDED.subscription_item_count, ignored_item_count = EXCLUDED.ignored_item_count, reason = EXCLUDED.reason, checked_at = NOW(), updated_at = NOW()`,
          [
            contextData.product.id,
            sourceId,
            countryRow.id,
            availabilityStatus,
            appId,
            code,
            page.url,
            page.finalUrl,
            page.status,
            page.items.length,
            matchedCount,
            ignoredCount,
            availabilityStatus === "available_with_prices" ? "Matched exact software plan aliases." : `No matched plan (${availabilityStatus}).`,
          ],
        );
      }

      for (const [planSlug, entry] of selected.entries()) {
        const rate = entry.currency === "USD" ? 1 : fx.rates[entry.currency];
        const convertedUsd = rate > 0 ? Number((entry.rawPrice / rate).toFixed(2)) : null;
        const fxRateToUsd = rate > 0 ? Number((1 / rate).toFixed(8)) : null;
        const anomaly = evaluateObservationAnomaly({
          countryCurrency,
          observedCurrency: entry.currency,
          convertedUsd: convertedUsd ?? 0,
          originalPriceText: entry.item.priceText,
          planSpec: entry.planSpec,
        });

        if (dryRun) {
          summary.dry_run += 1;
          const usdLabel = convertedUsd !== null ? `USD ${convertedUsd}` : "USD n/a";
          console.log(`[dry-run] ${code} ${planSlug} (${entry.item.name}) ${entry.item.priceText} -> ${usdLabel} via ${page.parserVersion}`);
          continue;
        }

        const planRow = contextData.plansBySlug.get(planSlug);
        if (!planRow || !countryRow || convertedUsd === null) {
          summary.skipped += 1;
          continue;
        }

        if (!force) {
          const dupRes = await client.query(
            `SELECT COUNT(*)::int AS cnt FROM price_observations
             WHERE product_id = $1 AND plan_id = $2 AND country_id = $3
               AND billing_platform = 'ios'::billing_platform
               AND price_type = 'list_price'::price_type
               AND source_id = $4 AND raw_price = $5 AND currency = $6
               AND observed_at > NOW() - CASE
                 WHEN EXISTS (
                   SELECT 1 FROM region_prices rp
                   WHERE rp.product_id = $1 AND rp.plan_id = $2 AND rp.country_id = $3
                     AND rp.billing_platform = 'ios'::billing_platform
                     AND rp.status = 'published'
                 ) THEN INTERVAL '12 hours'
                 ELSE INTERVAL '3 hours'
               END`,
            [contextData.product.id, planRow.id, countryRow.id, sourceId, entry.rawPrice, entry.currency],
          );
          if (dupRes.rows[0].cnt > 0) {
            summary.skipped += 1;
            continue;
          }
        }

        const payload = {
          observed_price_text: entry.item.priceText,
          item_name: entry.item.name,
          app_store_country: code,
          fx_rate_to_usd: fxRateToUsd,
          fx_rate_date: fx.rateDate,
          collector: "collect-app-store-prices.mjs",
          parser: page.parserVersion,
          anomaly_reason: anomaly.reason,
          review_note: anomaly.reason,
        };

        await client.query(
          `INSERT INTO price_observations (
            id, product_id, plan_id, country_id, source_id, source_level, billing_platform, price_type,
            raw_price, currency, converted_usd, source_url, raw_payload,
            confidence_score, status, anomaly_flag, anomaly_reason, parser_version, observed_at, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 'A'::source_level, 'ios'::billing_platform, 'list_price'::price_type,
            $5, $6, $7, $8, $9::jsonb,
            88, 'pending'::observation_status, $10, $11, $12, $13::timestamptz, NOW()
          )`,
          [
            contextData.product.id,
            planRow.id,
            countryRow.id,
            sourceId,
            entry.rawPrice,
            entry.currency,
            convertedUsd,
            page.url,
            JSON.stringify(payload),
            anomaly.flag,
            anomaly.reason,
            page.parserVersion,
            page.capturedAt,
          ],
        );
        summary.inserted += 1;
      }
    }

    const collectionOutcome =
      summary.transient_failures === 0
        ? "complete"
        : summary.confirmed_storefronts > 0
          ? "partial_success"
          : "transient_failure";

    const machineSummary = {
      collection_outcome: collectionOutcome,
      requested_country_codes: countryCodes,
      transient_country_codes: [...new Set(summary.transient_country_codes)],
      ...summary,
      unmatched_plan_candidates: summarizeUnmatchedPlanCandidates(unmatchedCandidates),
    };

    console.log(`GEOSUB_COLLECTION_RESULT=${JSON.stringify(machineSummary)}`);
    if (summary.transient_failures > 0) {
      throw new Error(`App Store collection incomplete. Transient failures: ${summary.transient_failures}`);
    }
    console.log(
      `App Store collection complete. Inserted: ${summary.inserted}. Skipped: ${summary.skipped}. Dry-run: ${summary.dry_run}. Missing: ${summary.missing}. Confirmed storefronts: ${summary.confirmed_storefronts}.`,
    );
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
