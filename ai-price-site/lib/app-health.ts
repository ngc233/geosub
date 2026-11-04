export type AppHealthPayload = {
  status: "ok" | "degraded" | "unavailable";
  version: string | null;
  commit: string | null;
  checks: {
    process: "ok";
    database: "ok" | "unavailable";
    catalog: "ok" | "empty" | "unknown";
    exchangeRates: "ok" | "empty" | "unknown";
  };
  data: {
    lastSuccessfulCollectionAt: string | null;
    pricesNotCheckedOver3Days: number | null;
  };
  checkedAt: string;
  durationMs: number;
};

export function normalizeHealthVersion(value: unknown): string | null {
  return typeof value === "string" && value.length <= 80 &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
    ? value : null;
}

export function normalizeHealthCommit(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value) ? value : null;
}

function collectionTime(value: unknown): string | null {
  if (!(value instanceof Date) && (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export async function checkAppHealth({
  pingDatabase,
  inspectBusinessData,
  inspectFreshness,
  build = {},
  now = () => new Date(),
  duration = () => 0,
}: {
  pingDatabase: () => Promise<unknown>;
  inspectBusinessData?: () => Promise<{
    publishedProducts: number;
    publishedPrices: number;
    activeExchangeRates: number;
  }>;
  inspectFreshness?: () => Promise<{
    lastSuccessfulCollectionAt: unknown;
    pricesNotCheckedOver3Days: unknown;
  }>;
  build?: { version?: unknown; commit?: unknown };
  now?: () => Date;
  duration?: () => number;
}): Promise<{ payload: AppHealthPayload; httpStatus: 200 | 503 }> {
  const version = normalizeHealthVersion(build.version);
  const commit = normalizeHealthCommit(build.commit);
  try {
    await pingDatabase();
    const data = inspectBusinessData
      ? await inspectBusinessData()
      : {
          publishedProducts: null,
          publishedPrices: null,
          activeExchangeRates: null,
        };
    const catalog = data.publishedProducts === null || data.publishedPrices === null
      ? "unknown"
      : data.publishedProducts > 0 && data.publishedPrices > 0 ? "ok" : "empty";
    const exchangeRates = data.activeExchangeRates === null
      ? "unknown"
      : data.activeExchangeRates > 0 ? "ok" : "empty";
    const status = catalog === "empty" || exchangeRates === "empty" ? "degraded" : "ok";
    // Observation only: neither old data nor a failed optional query changes
    // the existing status/checks/HTTP contract. Thresholds require a later PR.
    let freshness: AppHealthPayload["data"] = {
      lastSuccessfulCollectionAt: null, pricesNotCheckedOver3Days: null,
    };
    try {
      if (inspectFreshness) {
        const observed = await inspectFreshness();
        const count = observed.pricesNotCheckedOver3Days;
        freshness = {
          lastSuccessfulCollectionAt: collectionTime(observed.lastSuccessfulCollectionAt),
          pricesNotCheckedOver3Days: typeof count === "number" && Number.isSafeInteger(count) && count >= 0
            ? count : null,
        };
      }
    } catch { /* Do not expose errors or turn missing observations into outages. */ }

    return {
      httpStatus: 200,
      payload: {
        status,
        version,
        commit,
        checks: { process: "ok", database: "ok", catalog, exchangeRates },
        data: freshness,
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  } catch {
    return {
      httpStatus: 503,
      payload: {
        status: "unavailable",
        version,
        commit,
        checks: {
          process: "ok",
          database: "unavailable",
          catalog: "unknown",
          exchangeRates: "unknown",
        },
        data: {
          lastSuccessfulCollectionAt: null,
          pricesNotCheckedOver3Days: null,
        },
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  }
}
