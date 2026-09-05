export const PAGE_VIEW_MEASUREMENT_VERSION = "page-view-population.v2";
export const INTERNAL_MEASUREMENT_KEY = "geosub_measurement_internal_until";
const INTERNAL_MARKER_DAYS = 30;

export const PAGE_VIEW_POPULATION_METRICS = {
  eligible: "cookieless_page_views_eligible_v2",
  internal: "cookieless_page_views_internal_v2",
  automation: "cookieless_page_views_automation_v2",
  unclassified: "cookieless_page_views_unclassified_v2",
} as const;
export type PageViewPopulation = keyof typeof PAGE_VIEW_POPULATION_METRICS;

// A non-unique exclusion preference, never an account or browser identifier.
export function markInternalMeasurementBrowser(now = new Date()) {
  try {
    const until = new Date(now);
    until.setUTCDate(until.getUTCDate() + INTERNAL_MARKER_DAYS);
    window.localStorage.setItem(INTERNAL_MEASUREMENT_KEY, until.toISOString().slice(0, 10));
  } catch {
    // Storage-disabled browsers are classified as unknown, not eligible.
  }
}

export function getBrowserPageViewPopulation(now = new Date()): PageViewPopulation {
  if (typeof window === "undefined") return "unclassified";
  if (window.navigator.webdriver === true) return "automation";
  try {
    const until = window.localStorage.getItem(INTERNAL_MEASUREMENT_KEY);
    if (until === null) return "eligible";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return "unclassified";
    const expires = new Date(`${until}T00:00:00Z`);
    if (!Number.isFinite(expires.getTime()) || expires.toISOString().slice(0, 10) !== until) return "unclassified";
    return expires.getTime() > now.getTime() ? "internal" : "eligible";
  } catch {
    return "unclassified";
  }
}

export function classifyPageViewPopulation(payload: unknown, automationHeader: string | null): PageViewPopulation {
  // Controlled acceptance clients can opt out; this header grants no access.
  if (automationHeader === "automation") return "automation";
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "unclassified";
  const { measurementVersion, population } = payload as Record<string, unknown>;
  if (measurementVersion !== PAGE_VIEW_MEASUREMENT_VERSION) return "unclassified";
  if (population === "eligible" || population === "internal" || population === "automation") return population;
  return "unclassified";
}
