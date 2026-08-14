export type AppHealthPayload = {
  status: "ok" | "unavailable";
  checks: {
    process: "ok";
    database: "ok" | "unavailable";
  };
  checkedAt: string;
  durationMs: number;
};

export async function checkAppHealth({
  pingDatabase,
  now = () => new Date(),
  duration = () => 0,
}: {
  pingDatabase: () => Promise<unknown>;
  now?: () => Date;
  duration?: () => number;
}): Promise<{ payload: AppHealthPayload; httpStatus: 200 | 503 }> {
  try {
    await pingDatabase();

    return {
      httpStatus: 200,
      payload: {
        status: "ok",
        checks: { process: "ok", database: "ok" },
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  } catch {
    return {
      httpStatus: 503,
      payload: {
        status: "unavailable",
        checks: { process: "ok", database: "unavailable" },
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, Math.round(duration())),
      },
    };
  }
}
