import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

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
const DEFAULT_QUOTES = ["CNY"];

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

function getAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.EXCHANGE_RATE_CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerSecret === secret;
}

function parseQuotes(request: NextRequest) {
  const quotes = request.nextUrl.searchParams.get("quotes");

  if (!quotes) return DEFAULT_QUOTES;

  return quotes
    .split(",")
    .map(normalizeCurrency)
    .filter((value) => value && value !== DEFAULT_BASE);
}

async function fetchFrankfurterRates(base: string, quotes: string[]) {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${quotes
    .map(encodeURIComponent)
    .join(",")}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}`);
  }

  const payload = (await response.json()) as FrankfurterResponse;

  return {
    source: "frankfurter",
    requestedUrl: url,
    rateDate: payload.date || new Date().toISOString().slice(0, 10),
    rates: payload.rates || {},
  };
}

async function fetchOpenErApiRates(base: string) {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`open.er-api returned ${response.status}`);
  }

  const payload = (await response.json()) as OpenErApiResponse;
  const rateDate = payload.time_last_update_utc
    ? new Date(payload.time_last_update_utc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    source: "open-er-api",
    requestedUrl: url,
    rateDate,
    rates: payload.rates || {},
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

  let result: Awaited<ReturnType<typeof fetchFrankfurterRates>>;

  try {
    result = await fetchFrankfurterRates(base, quotes);
  } catch {
    result = await fetchOpenErApiRates(base);
  }

  const synced: Array<{ quote: string; rate: number }> = [];

  for (const quote of quotes) {
    const rate = result.rates[quote];

    if (!rate || rate <= 0) {
      continue;
    }

    await upsertRate({
      base,
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

export async function GET(request: NextRequest) {
  return POST(request);
}
