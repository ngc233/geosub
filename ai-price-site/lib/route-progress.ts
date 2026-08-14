export const ROUTE_PROGRESS_START_EVENT = "geosub:route-progress-start";

export function startRouteProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROUTE_PROGRESS_START_EVENT));
}
