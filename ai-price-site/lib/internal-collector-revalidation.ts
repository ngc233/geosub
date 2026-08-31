import "server-only";

import { getInternalRevalidationToken } from "./internal-revalidation-auth";

function loopbackOrigin() {
  const rawPort = process.env.PORT || "3000";
  if (!/^\d{1,5}$/.test(rawPort)) {
    throw new Error("PORT must be a valid loopback HTTP port.");
  }
  const port = Number(rawPort);
  if (port < 1 || port > 65_535) {
    throw new Error("PORT must be a valid loopback HTTP port.");
  }
  return `http://127.0.0.1:${port}`;
}

export async function requestSuccessfulCollectorRevalidation(jobId: string) {
  const response = await fetch(
    `${loopbackOrigin()}/api/internal/revalidate/collector-success`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-geosub-internal-revalidation": getInternalRevalidationToken(),
      },
      body: JSON.stringify({ jobId }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Collector revalidation endpoint returned HTTP ${response.status}.`,
    );
  }
}
