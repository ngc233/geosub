export type AppHealthPayload = {
  status: "ok" | "degraded" | "unavailable";
  checks: {
    process: "ok";
    database: "ok" | "unavailable";
    catalog: "ok" | "empty" | "unknown";
    exchangeRates: "ok" | "empty" | "unknown";
  };
  data: {
    publishedProducts: number | null;
    publishedPrices: number | null;
    activeExchangeRates: number | null;
  };
  checkedAt: string;
  durationMs: number;
};

export async function checkAppHealth({
  pingDatabase,
  inspectBusinessData,
  now = () => new Date(),
  duration = () => 0,
}: {
  pingDatabase: () => Promise<unknown>;
  inspectBusinessData?: () => Promise<{
    publishedProducts: number;
    publishedPrices: number;
    activeExchangeRates: number;
  }>;
  now?: () => Date;
  duration?: () => number;
}): Promise<{ payload: AppHealthPayload; httpStatus: 200 | 503 }> {
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

    return {
      httpStatus: 200,
      payload: {
        status,
        checks: { process: "ok", database: "ok", catalog, exchangeRates },
        data,
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  } catch {
    return {
      httpStatus: 503,
      payload: {
        status: "unavailable",
        checks: {
          process: "ok",
          database: "unavailable",
          catalog: "unknown",
          exchangeRates: "unknown",
        },
        data: {
          publishedProducts: null,
          publishedPrices: null,
          activeExchangeRates: null,
        },
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  }
}
