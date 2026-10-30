// The reverse proxy appends the peer address to any client-sent X-Forwarded-For
// ($proxy_add_x_forwarded_for), so its left-most value is attacker-controlled and
// must never key a security decision. Only headers set by our own proxy chain count.
const DEFAULT_CLIENT_IP_HEADER = "x-real-ip";

export type HeaderReader = {
  get(name: string): string | null;
};

export function normalizeClientIp(value: string | null) {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, "");

  return normalized ? normalized.slice(0, 120) : "unknown";
}

export function getTrustedClientIp(
  headers: HeaderReader,
  configuredHeader = process.env.GEOSUB_CLIENT_IP_HEADER ||
    process.env.GEOSUB_EVENTS_CLIENT_IP_HEADER,
) {
  const headerName = configuredHeader?.trim().toLowerCase() || DEFAULT_CLIENT_IP_HEADER;

  if (headerName === "x-forwarded-for-rightmost") {
    const forwarded = headers.get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return normalizeClientIp(forwarded?.at(-1) || null);
  }

  if (headerName === "cf-connecting-ip") {
    return normalizeClientIp(headers.get("cf-connecting-ip"));
  }

  return normalizeClientIp(headers.get(DEFAULT_CLIENT_IP_HEADER));
}
