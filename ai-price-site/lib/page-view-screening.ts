import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { getTrustedClientIp, type HeaderReader } from "./client-ip.ts";
import type { PageViewPopulation } from "./page-view-measurement.ts";

export const PAGE_VIEW_SCREENING_VERSION = "page-view-screening.v3";
export const SCREENED_PAGE_VIEW_METRICS = {
  eligible: "cookieless_page_views_eligible_v3",
  suspected: "cookieless_page_views_suspected_v3",
  internal: "cookieless_page_views_internal_v3",
  automation: "cookieless_page_views_automation_v3",
  unclassified: "cookieless_page_views_unclassified_v3",
} as const;
export type ScreenedPopulation = keyof typeof SCREENED_PAGE_VIEW_METRICS;
export type ScreeningReason = "declared_automation" | "inconsistent_browser_headers" | "rapid_broad_navigation";

// Explicit automation tokens only. Browser family/version, missing optional headers,
// language, country, and a shared IP are never sufficient evidence on their own.
const AUTOMATION_AGENT = /bot\b|spider|crawler|headlesschrome|phantomjs|playwright|puppeteer|selenium|python-requests|python-urllib|curl\/|wget\/|go-http-client|httpclient|scrapy|lighthouse|pagespeed|facebookexternalhit|facebookcatalog|slackbot|discordbot|telegrambot|whatsapp\//i;

export function headerScreeningReason(headers: HeaderReader): ScreeningReason | null {
  const ua = (headers.get("user-agent") || "").slice(0, 2048);
  if (AUTOMATION_AGENT.test(ua)) return "declared_automation";
  const mode = headers.get("sec-fetch-mode");
  const dest = headers.get("sec-fetch-dest");
  if (mode === "navigate" || mode === "websocket" || (dest && dest !== "empty")) {
    return "inconsistent_browser_headers";
  }
  const chromiumHint = /"(?:Chromium|Google Chrome|Microsoft Edge)"/i.test(headers.get("sec-ch-ua") || "");
  if (chromiumHint && /Firefox\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return "inconsistent_browser_headers";
  }
  return null;
}

const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;
const REQUEST_THRESHOLD = 120;
const PATH_THRESHOLD = 30;
type Window = { started: number; count: number; paths: Set<string> };

/** Process-local, bounded, short-lived HMAC counters. No raw IP/UA/path or cookie
 * is stored, logged, or persisted. Never combine requests with an unknown peer.
 * Proxy trust follows client-ip.ts; rotated sources and multiple workers can evade
 * this conservative signal. Requests before a threshold are not reclassified. */
export function createPageViewScreener({ maxKeys = MAX_KEYS, secret = randomBytes(32) } = {}) {
  const windows = new Map<string, Window>();
  const capacity = Math.max(1, Math.min(MAX_KEYS, Math.trunc(maxKeys) || 1));
  const digest = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  function prune(now: number) {
    for (const [key, state] of windows) {
      if (now - state.started >= WINDOW_MS || now < state.started) windows.delete(key);
    }
  }
  return {
    prune,
    get size() { return windows.size; },
    classify(population: PageViewPopulation, headers: HeaderReader, pagePath: string, now = Date.now()): ScreenedPopulation {
      // Preserve explicit opt-out categories. A client cannot opt into eligible
      // to override server evidence, nor opt into a made-up v3 population.
      if (population !== "eligible") return population;
      if (headerScreeningReason(headers)) return "suspected";
      const ip = getTrustedClientIp(headers);
      const ua = (headers.get("user-agent") || "").slice(0, 2048);
      if (!isIP(ip) || !ua) return "eligible";
      const key = digest(`${ip}\n${ua}`);
      let state = windows.get(key);
      if (!state || now < state.started || now - state.started >= WINDOW_MS) {
        if (windows.size >= capacity) {
          prune(now);
          if (windows.size >= capacity) windows.delete(windows.keys().next().value!);
        }
        state = { started: now, count: 0, paths: new Set() };
        windows.set(key, state);
      }
      state.count += 1;
      if (state.paths.size < PATH_THRESHOLD) state.paths.add(digest(pagePath));
      return state.count > REQUEST_THRESHOLD && state.paths.size >= PATH_THRESHOLD ? "suspected" : "eligible";
    },
  };
}

const screener = createPageViewScreener();
// Also expire inactive entries when no new traffic arrives. Timer does not keep
// a worker alive, and all state disappears at process exit/restart.
setInterval(() => screener.prune(Date.now()), WINDOW_MS).unref();
export const screenPageView = screener.classify;
