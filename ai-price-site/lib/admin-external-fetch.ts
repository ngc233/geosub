const DEFAULT_ADMIN_EXTERNAL_FETCH_TIMEOUT_MS = 8_000;

export async function fetchAdminExternalJson<T>(
  url: string,
  options: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    label?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<T | null> {
  const timeoutMs =
    typeof options.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? Math.trunc(options.timeoutMs)
      : DEFAULT_ADMIN_EXTERNAL_FETCH_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? fetch;
  let host = "unknown";

  try {
    host = new URL(url).host;
  } catch {
    host = "invalid-url";
  }

  try {
    const response = await fetchFn(url, {
      headers: {
        "User-Agent": "GeoSubAdmin/1.0",
        ...options.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      console.warn(
        JSON.stringify({
          event: "admin_external_fetch_non_ok",
          label: options.label ?? "external_json",
          host,
          status: response.status,
        }),
      );
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.name || "Error"
        : typeof error;
    console.warn(
      JSON.stringify({
        event: "admin_external_fetch_failed",
        label: options.label ?? "external_json",
        host,
        timeoutMs,
        reason,
      }),
    );
    return null;
  }
}
