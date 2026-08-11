import "server-only";

const DEFAULT_SLOW_ADMIN_WORKLOAD_MS = 750;

function getSlowWorkloadThresholdMs() {
  const configured = Number(process.env.GEOSUB_ADMIN_SLOW_WORKLOAD_MS);

  if (!Number.isFinite(configured)) {
    return DEFAULT_SLOW_ADMIN_WORKLOAD_MS;
  }

  return Math.min(Math.max(Math.trunc(configured), 100), 30_000);
}

export async function measureAdminWorkload<T>(
  operation: string,
  workload: () => Promise<T>,
) {
  const startedAt = performance.now();
  let status: "ok" | "error" = "ok";

  try {
    return await workload();
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    const shouldLogAll = process.env.GEOSUB_ADMIN_PERFORMANCE_LOG === "true";

    if (
      shouldLogAll ||
      status === "error" ||
      durationMs >= getSlowWorkloadThresholdMs()
    ) {
      console.info(
        `[admin-performance] ${JSON.stringify({
          operation,
          durationMs,
          status,
        })}`,
      );
    }
  }
}
