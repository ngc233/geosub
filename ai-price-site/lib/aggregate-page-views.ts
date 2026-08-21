export const AGGREGATE_PAGE_VIEW_METRIC = "cookieless_page_views";
export const AGGREGATE_PAGE_VIEW_SOURCE = "first_party_cookieless_daily_counter";

const MAX_PAGE_PATH_LENGTH = 300;
const PUBLIC_LOCALE_PATH =
  /^\/(?:zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?:\/|$)/;

const EXCLUDED_PATHS = [
  "/zh/tracking-test",
  "/zh/cms-test",
] as const;

export function normalizeAggregatePagePath(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > MAX_PAGE_PATH_LENGTH ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    !PUBLIC_LOCALE_PATH.test(trimmed) ||
    EXCLUDED_PATHS.some(
      (path) => trimmed === path || trimmed.startsWith(`${path}/`),
    )
  ) {
    return null;
  }

  return trimmed.length > 1 && trimmed.endsWith("/")
    ? trimmed.slice(0, -1)
    : trimmed;
}

export function getUtcStatDate(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
