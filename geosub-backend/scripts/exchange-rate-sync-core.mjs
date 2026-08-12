export const DEFAULT_EXCHANGE_RATE_QUOTES = Object.freeze([
  "AED",
  "ARS",
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "DKK",
  "EGP",
  "EUR",
  "GBP",
  "HKD",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KES",
  "KRW",
  "MXN",
  "MYR",
  "NGN",
  "NOK",
  "NZD",
  "PHP",
  "PKR",
  "PLN",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "VND",
  "ZAR",
]);

export function normalizeCurrency(value) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeQuoteCurrencies(values, baseCurrency = "USD") {
  const base = normalizeCurrency(baseCurrency);
  const input = Array.isArray(values) ? values : [values];

  return [
    ...new Set(
      input
        .flatMap((value) => String(value || "").split(","))
        .map(normalizeCurrency)
        .filter((value) => value && value !== base),
    ),
  ];
}

export function formatRateDate(value, fallbackDate) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return fallbackDate;
}

export function buildFrankfurterUrl(base, quotes) {
  return `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${quotes
    .map(encodeURIComponent)
    .join(",")}`;
}

export function buildOpenErApiUrl(base) {
  return `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
}

function positiveRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function rowsFromProvider({ base, quotes, provider, url, rateDate, payload }) {
  const rates = payload?.rates || {};

  return quotes.flatMap((quote) => {
    const rate = positiveRate(rates[quote]);
    if (rate === null) return [];

    return [
      {
        base,
        quote,
        rate,
        rateDate,
        source: provider,
        requestedUrl: url,
        providerPayload: payload,
      },
    ];
  });
}

async function requestProvider({ provider, base, quotes, fetchJson, today }) {
  const url =
    provider === "frankfurter"
      ? buildFrankfurterUrl(base, quotes)
      : buildOpenErApiUrl(base);
  const payload = await fetchJson(url, provider);
  const rateDate =
    provider === "frankfurter"
      ? formatRateDate(payload?.date, today)
      : formatRateDate(payload?.time_last_update_utc, today);

  return {
    provider,
    url,
    rateDate,
    payload,
    rows: rowsFromProvider({
      base,
      quotes,
      provider,
      url,
      rateDate,
      payload,
    }),
  };
}

export async function resolveExchangeRatePlan({
  baseCurrency = "USD",
  quoteCurrencies = DEFAULT_EXCHANGE_RATE_QUOTES,
  provider = "frankfurter",
  fetchJson,
  now = new Date(),
}) {
  const base = normalizeCurrency(baseCurrency);
  const quotes = normalizeQuoteCurrencies(quoteCurrencies, base);
  const today = now.toISOString().slice(0, 10);

  if (!base) throw new Error("Base currency is required.");
  if (quotes.length === 0) {
    throw new Error("At least one quote currency different from base currency is required.");
  }
  if (!["frankfurter", "open-er-api"].includes(provider)) {
    throw new Error(
      `Unsupported provider '${provider}'. Current script supports 'frankfurter' and 'open-er-api'.`,
    );
  }
  if (typeof fetchJson !== "function") {
    throw new Error("A provider fetch function is required.");
  }

  const attempts = [];
  const warnings = [];
  let primary = null;

  if (provider === "frankfurter") {
    try {
      primary = await requestProvider({
        provider: "frankfurter",
        base,
        quotes,
        fetchJson,
        today,
      });
      attempts.push({
        provider: primary.provider,
        url: primary.url,
        ok: true,
        rowCount: primary.rows.length,
      });
    } catch (error) {
      const url = buildFrankfurterUrl(base, quotes);
      attempts.push({ provider: "frankfurter", url, ok: false, rowCount: 0 });
      warnings.push(`Frankfurter FX lookup failed: ${error.message}`);
    }
  }

  if (provider === "open-er-api") {
    primary = await requestProvider({
      provider: "open-er-api",
      base,
      quotes,
      fetchJson,
      today,
    });
    attempts.push({
      provider: primary.provider,
      url: primary.url,
      ok: true,
      rowCount: primary.rows.length,
    });
  }

  const selectedRows = new Map((primary?.rows || []).map((row) => [row.quote, row]));
  const missingAfterPrimary = quotes.filter((quote) => !selectedRows.has(quote));

  if (provider === "frankfurter" && missingAfterPrimary.length > 0) {
    if (primary) {
      warnings.push(
        `Frankfurter omitted ${missingAfterPrimary.length} quote currencies; filling them from open.er-api.`,
      );
    } else {
      warnings.push("Falling back to open.er-api.");
    }

    const fallback = await requestProvider({
      provider: "open-er-api",
      base,
      quotes: missingAfterPrimary,
      fetchJson,
      today,
    });
    attempts.push({
      provider: fallback.provider,
      url: fallback.url,
      ok: true,
      rowCount: fallback.rows.length,
    });

    for (const row of fallback.rows) {
      selectedRows.set(row.quote, row);
    }
  }

  const rows = quotes.flatMap((quote) => {
    const row = selectedRows.get(quote);
    return row ? [row] : [];
  });
  const missingQuotes = quotes.filter((quote) => !selectedRows.has(quote));

  return {
    base,
    quotes,
    provider,
    rows,
    missingQuotes,
    attempts,
    requestedUrls: attempts.map((attempt) => attempt.url),
    warnings,
    status: rows.length === quotes.length ? "succeeded" : "partial",
  };
}

export function summarizeExchangeRatePlan(plan) {
  return {
    base: plan.base,
    quotes: plan.quotes,
    provider: plan.provider,
    status: plan.status,
    rowCount: plan.rows.length,
    quoteCount: plan.quotes.length,
    missingQuotes: plan.missingQuotes,
    requestedUrls: plan.requestedUrls,
    warnings: plan.warnings,
    rows: plan.rows.map(({ quote, rate, rateDate, source }) => ({
      quote,
      rate,
      rateDate,
      source,
    })),
  };
}
