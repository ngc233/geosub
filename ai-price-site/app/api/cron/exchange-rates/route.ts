import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { supportedDisplayCurrencies } from "../../../../lib/display-currency";
import { PUBLIC_EXCHANGE_RATE_CACHE_TAG } from "../../../../lib/public-pricing-cache";
import { secretsMatch } from "../../../../lib/secure-secret";

export const dynamic = "force-dynamic";

type FrankfurterResponse = {
  date?: string;
  rates?: Record<string, number>;
};

type OpenErApiResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

const DEFAULT_BASE = "USD";
const EXCHANGE_RATE_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_QUOTES = supportedDisplayCurrencies.filter(
  (currency) => currency !== DEFAULT_BASE,
);

type FetchedRatesResult = {
  source: string;
  requestedUrl: string;
  rateDate: string;
  rates: Record<string, number>;
  quoteSources?: Record<string, { source: string; rateDate: string; requestedUrl: string }>;
};

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

function getAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.EXCHANGE_RATE_CRON_SECRET;

  if (!secret) {
    const allowed = process.env.NODE_ENV !== "production";

    if (allowed) {
      console.warn(
        "Exchange-rate cron secret is not configured; allowing this request outside production.",
      );
    }

    return allowed;
  }

  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return secretsMatch(headerSecret, secret);
}

function parseQuotes(request: NextRequest) {
  const quotes = request.nextUrl.searchParams.get("quotes");

  if (!quotes) return DEFAULT_QUOTES;

  return quotes
    .split(",")
    .map(normalizeCurrency)
    .filter((value) => value && value !== DEFAULT_BASE);
}

async function fetchFrankfurterRates(base: string, quotes: string[]): Promise<FetchedRatesResult> {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${quotes
    .map(encodeURIComponent)
    .join(",")}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(EXCHANGE_RATE_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}`);
  }

  const payload = (await response.json()) as FrankfurterResponse;
  const rateDate = payload.date || new Date().toISOString().slice(0, 10);
  const rates: Record<string, number> = {};
  const quoteSources: Record<string, { source: string; rateDate: string; requestedUrl: string }> = {};

  for (const quote of quotes) {
    const rate = Number(payload.rates?.[quote]);
    if (Number.isFinite(rate) && rate > 0) {
      rates[quote] = rate;
      quoteSources[quote] = { source: "frankfurter", rateDate, requestedUrl: url };
    }
  }

  return {
    source: "frankfurter",
    requestedUrl: url,
    rateDate,
    rates,
    quoteSources,
  };
}

async function fetchOpenErApiRates(base: string, targetQuotes?: string[]): Promise<FetchedRatesResult> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(EXCHANGE_RATE_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`open.er-api returned ${response.status}`);
  }

  const payload = (await response.json()) as OpenErApiResponse;
  const rateDate = payload.time_last_update_utc
    ? new Date(payload.time_last_update_utc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const rawRates = payload.rates || {};
  const selectedQuotes = targetQuotes ?? Object.keys(rawRates);
  const rates: Record<string, number> = {};
  const quoteSources: Record<string, { source: string; rateDate: string; requestedUrl: string }> = {};

  for (const quote of selectedQuotes) {
    const rate = Number(rawRates[quote]);
    if (Number.isFinite(rate) && rate > 0) {
      rates[quote] = rate;
      quoteSources[quote] = { source: "open-er-api", rateDate, requestedUrl: url };
    }
  }

  return {
    source: "open-er-api",
    requestedUrl: url,
    rateDate,
    rates,
    quoteSources,
  };
}

async function getRates(base: string, quotes: string[]): Promise<FetchedRatesResult> {
  let primary: FetchedRatesResult;

  try {
    primary = await fetchFrankfurterRates(base, quotes);
  } catch {
    return fetchOpenErApiRates(base, quotes);
  }

  const missingQuotes = quotes.filter((quote) => {
    const rate = Number(primary.rates[quote]);
    return !Number.isFinite(rate) || rate <= 0;
  });

  if (missingQuotes.length === 0) {
    return primary;
  }

  const fallback = await fetchOpenErApiRates(base, missingQuotes);

  return {
    source: "frankfurter+open-er-api",
    requestedUrl: `${primary.requestedUrl} | ${fallback.requestedUrl}`,
    rateDate: primary.rateDate || fallback.rateDate,
    rates: { ...primary.rates, ...fallback.rates },
    quoteSources: { ...primary.quoteSources, ...fallback.quoteSources },
  };
}

async function upsertRate({
  base,
  quote,
  rate,
  rateDate,
  source,
  providerPayload,
}: {
  base: string;
  quote: string;
  rate: number;
  rateDate: string;
  source: string;
  providerPayload: Record<string, unknown>;
}) {
  await prisma.$executeRaw`
    SELECT upsert_exchange_rate(
      ${base},
      ${quote},
      ${rate},
      ${rateDate}::date,
      ${source},
      NOW(),
      NULL,
      ${JSON.stringify(providerPayload)}::jsonb
    )
  `;
}

export async function POST(request: NextRequest) {
  if (!getAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = normalizeCurrency(
    request.nextUrl.searchParams.get("base") || DEFAULT_BASE,
  );
  const quotes = parseQuotes(request);

  if (quotes.length === 0) {
    return NextResponse.json(
      { error: "At least one quote currency is required." },
      { status: 400 },
    );
  }

  let result: FetchedRatesResult;
  try {
    result = await getRates(base, quotes);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Exchange-rate provider unavailable." },
      { status: 502 },
    );
  }

  const synced: Array<{ quote: string; rate: number }> = [];

  for (const quote of quotes) {
    const rate = result.rates[quote];

    if (!rate || rate <= 0) {
      continue;
    }

    const quoteMeta = result.quoteSources?.[quote];
    const rowSource = quoteMeta?.source || result.source;
    const rowRateDate = quoteMeta?.rateDate || result.rateDate;
    const rowRequestedUrl = quoteMeta?.requestedUrl || result.requestedUrl;

    await upsertRate({
      base,
      quote,
      rate,
      rateDate: rowRateDate,
      source: rowSource,
      providerPayload: {
        source: rowSource,
        requestedUrl: rowRequestedUrl,
        rateDate: rowRateDate,
        quote,
        rate,
      },
    });

    synced.push({ quote, rate });
  }

  if (synced.length > 0) {
    revalidateTag(PUBLIC_EXCHANGE_RATE_CACHE_TAG, "max");
  }

  return NextResponse.json({
    ok: synced.length === quotes.length,
    base,
    quotes,
    synced,
    source: result.source,
    rateDate: result.rateDate,
    requestedUrl: result.requestedUrl,
    recommendedSchedule: "Every 12 hours",
  });
}
