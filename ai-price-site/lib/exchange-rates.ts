import { prisma } from "./prisma";

export type ExchangeRateSnapshot = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: string | null;
  rateDate: string | null;
  fetchedAt: string | null;
  isFallback: boolean;
};

type RawExchangeRate = {
  base_currency: string;
  quote_currency: string;
  rate: unknown;
  source: string | null;
  rate_date: Date | string | null;
  fetched_at: Date | string | null;
};

const FALLBACK_USD_CNY_RATE = 7.25;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

function formatDateOnly(value: Date | string | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export async function getLatestExchangeRate(
  baseCurrency: string,
  quoteCurrency: string,
): Promise<ExchangeRateSnapshot> {
  const base = baseCurrency.trim().toUpperCase();
  const quote = quoteCurrency.trim().toUpperCase();

  try {
    const rows = await prisma.$queryRaw<RawExchangeRate[]>`
      SELECT
        base_currency,
        quote_currency,
        rate,
        source,
        rate_date,
        fetched_at
      FROM get_latest_exchange_rate(${base}, ${quote})
      LIMIT 1
    `;

    const row = rows[0];
    const rate = row ? toNumber(row.rate) : 0;

    if (row && rate > 0) {
      return {
        baseCurrency: row.base_currency,
        quoteCurrency: row.quote_currency,
        rate,
        source: row.source,
        rateDate: formatDateOnly(row.rate_date),
        fetchedAt: formatDateTime(row.fetched_at),
        isFallback: false,
      };
    }
  } catch (error) {
    console.error("Failed to load exchange rate", error);
  }

  return {
    baseCurrency: base,
    quoteCurrency: quote,
    rate: base === "USD" && quote === "CNY" ? FALLBACK_USD_CNY_RATE : 1,
    source: null,
    rateDate: null,
    fetchedAt: null,
    isFallback: true,
  };
}
