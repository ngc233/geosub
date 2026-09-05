#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GOOGLE_GROWTH_CONTRACT_VERSION = "growth-metrics.v1";
export const GOOGLE_API_BASE_URL =
  process.env.GEOSUB_GOOGLE_API_BASE_URL ||
  "https://www.googleapis.com/webmasters/v3";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function integer(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
  return parsed;
}

function date(value, label) {
  const normalized = assertString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)
    || !Number.isFinite(Date.parse(`${normalized}T00:00:00Z`))
    || new Date(`${normalized}T00:00:00Z`).toISOString().slice(0, 10) !== normalized) {
    throw new Error(`${label} must be an ISO calendar date.`);
  }
  return normalized;
}

function parseEnvelope(payload, dimensions) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) {
    throw new Error(`Google Search Console ${dimensions.join(",")} response shape is invalid.`);
  }
  return payload;
}

export async function refreshGoogleAccessToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = globalThis.fetch,
}) {
  assertString(clientId, "Google client ID");
  assertString(clientSecret, "Google client secret");
  assertString(refreshToken, "Google refresh token");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Google refresh request failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!payload || typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Google refresh response did not contain an access token.");
  }
  return payload;
}

export async function fetchGoogleSearchAnalytics({
  accessToken,
  siteUrl,
  startDate,
  endDate,
  dimensions,
  fetchImpl = globalThis.fetch,
}) {
  assertString(accessToken, "Google access token");
  if (!["https://geosub.org/", "sc-domain:geosub.org"].includes(siteUrl)) throw new Error("Google site must be a GeoSub property.");
  const start = date(startDate, "Google start date");
  const end = date(endDate, "Google end date");
  if (start > end) throw new Error("Google start date must not exceed end date.");
  if (!Array.isArray(dimensions) || dimensions.length === 0) throw new Error("Google dimensions are required.");
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const url = `${GOOGLE_API_BASE_URL}/sites/${encodedSiteUrl}/searchAnalytics/query`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ startDate: start, endDate: end, dimensions, type: "web", dataState: "final", rowLimit: 25000 }),
  });
  if (!response.ok) throw new Error(`Google Search Console request failed with HTTP ${response.status}.`);
  return parseEnvelope(await response.json(), dimensions);
}

function publicPath(value, siteUrl) {
  try {
    const base = siteUrl === "sc-domain:geosub.org" ? "https://geosub.org/" : siteUrl;
    const url = new URL(String(value || ""), base);
    const site = new URL(base);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.hostname.toLowerCase().replace(/^www\./, "") !== site.hostname.toLowerCase().replace(/^www\./, "")) return null;
    if (!/^\/(?:zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?:\/|$)/.test(url.pathname)) return null;
    return url.pathname.replace(/\/$/, "") || "/zh";
  } catch {
    return null;
  }
}

function buildDailyRows(payload, startDate, endDate) {
  return payload.rows.map((row) => {
    if (!Array.isArray(row.keys) || row.keys.length !== 1) throw new Error("Google daily row keys are invalid.");
    const rowDate = date(row.keys[0], "Google daily row date");
    if (rowDate < startDate || rowDate > endDate) throw new Error("Google daily row falls outside the requested period.");
    const clicks = integer(row.clicks, "Google clicks");
    const impressions = integer(row.impressions, "Google impressions");
    if (clicks > impressions) throw new Error("Google clicks exceed impressions.");
    return { date: rowDate, clicks, impressions };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function buildPageRows(payload, siteUrl) {
  const pageBuckets = new Map();
  payload.rows.forEach((row) => {
    if (!Array.isArray(row.keys) || row.keys.length !== 1) throw new Error("Google page row keys are invalid.");
    const page = publicPath(row.keys[0], siteUrl);
    if (!page) return;
    const clicks = integer(row.clicks, "Google page clicks");
    const impressions = integer(row.impressions, "Google page impressions");
    if (clicks > impressions) return;
    const position = Number(row.position);
    const existing = pageBuckets.get(page) || { path: page, clicks: 0, impressions: 0, positionWeighted: 0, positionWeight: 0 };
    existing.clicks += clicks;
    existing.impressions += impressions;
    if (Number.isFinite(position) && position >= 0 && position <= 1000 && impressions > 0) {
      existing.positionWeighted += position * impressions;
      existing.positionWeight += impressions;
    }
    pageBuckets.set(page, existing);
  });
  return [...pageBuckets.values()].map(({ path: page, clicks, impressions, positionWeighted, positionWeight }) => ({
    path: page, clicks, impressions,
    ...(positionWeight > 0 ? { averagePosition: positionWeighted / positionWeight } : {}),
  })).sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path));
}

export function buildGoogleGrowthSnapshot({
  dailyPayload,
  pagePayload,
  siteUrl = "https://geosub.org/",
  startDate,
  endDate,
  collectedAt = new Date().toISOString(),
}) {
  const site = assertString(siteUrl, "Google site URL");
  if (!["https://geosub.org/", "sc-domain:geosub.org"].includes(site)) throw new Error("Google site must be a GeoSub property.");
  const start = date(startDate, "Google start date");
  const end = date(endDate, "Google end date");
  const daily = buildDailyRows(parseEnvelope(dailyPayload, ["date"]), start, end);
  const pages = parseEnvelope(pagePayload, ["page"]);
  if (!daily.length) throw new Error("Google Search Console returned no daily rows.");
  return {
    schemaVersion: GOOGLE_GROWTH_CONTRACT_VERSION,
    source: "google_search_console",
    site,
    periodStart: start,
    periodEnd: end,
    settledThrough: null,
    sourceTimezone: "America/Los_Angeles",
    collectedAt,
    status: "partial",
    sampling: { kind: "provider_final", missingShare: null },
    contractVersion: GOOGLE_GROWTH_CONTRACT_VERSION,
    endpointKind: "search_analytics",
    daily,
    pages: { availableRows: pages.rows.length, rows: buildPageRows(pages, site) },
    querySummary: { availableRows: null },
    limitations: [
      "Google Search Console dataState=final is used, but this adapter does not assert provider settlement through a separate watermark.",
      "Search Analytics may omit days without data and is bounded to top rows; page rows are not a site-total substitute.",
      "Raw query dimensions are not requested or stored.",
      ...(site.startsWith("sc-domain:") ? ["Site totals cover the domain property including subdomains and protocols; selected page rows retain only GeoSub public locale paths on the main or www host."] : []),
    ],
  };
}

async function resolveGoogleAccessToken({ tokenFile, fetchImpl = globalThis.fetch }) {
  if (process.env.GEOSUB_GOOGLE_ACCESS_TOKEN) return process.env.GEOSUB_GOOGLE_ACCESS_TOKEN;
  if (process.env.GEOSUB_GOOGLE_CLIENT_ID && process.env.GEOSUB_GOOGLE_CLIENT_SECRET && process.env.GEOSUB_GOOGLE_REFRESH_TOKEN) {
    const refreshed = await refreshGoogleAccessToken({
      clientId: process.env.GEOSUB_GOOGLE_CLIENT_ID,
      clientSecret: process.env.GEOSUB_GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GEOSUB_GOOGLE_REFRESH_TOKEN,
      fetchImpl,
    });
    return refreshed.access_token;
  }
  if (!tokenFile) throw new Error("Google credentials are not configured.");
  const token = JSON.parse(await readFile(tokenFile, "utf8"));
  return assertString(token.access_token, "Google access token");
}

async function main() {
  const outputFile = process.env.GEOSUB_GOOGLE_OUTPUT_FILE;
  const siteUrl = process.env.GEOSUB_GOOGLE_SITE_URL || "https://geosub.org/";
  const startDate = process.env.GEOSUB_GOOGLE_START_DATE;
  const endDate = process.env.GEOSUB_GOOGLE_END_DATE;
  if (!outputFile || !startDate || !endDate) throw new Error("GEOSUB_GOOGLE_OUTPUT_FILE, GEOSUB_GOOGLE_START_DATE, and GEOSUB_GOOGLE_END_DATE are required.");
  const accessToken = await resolveGoogleAccessToken({ tokenFile: process.env.GEOSUB_GOOGLE_TOKEN_FILE });
  const [dailyPayload, pagePayload] = await Promise.all([
    fetchGoogleSearchAnalytics({ accessToken, siteUrl, startDate, endDate, dimensions: ["date"] }),
    fetchGoogleSearchAnalytics({ accessToken, siteUrl, startDate, endDate, dimensions: ["page"] }),
  ]);
  const snapshot = buildGoogleGrowthSnapshot({ dailyPayload, pagePayload, siteUrl, startDate, endDate });
  await mkdir(path.dirname(outputFile), { recursive: true, mode: 0o700 });
  await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(JSON.stringify({ status: snapshot.status, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd, dailyRows: snapshot.daily.length, pageRows: snapshot.pages.availableRows }) + "\n");
}

const entryPath = process.argv[1] ? realpathSync(process.argv[1]) : null;
const modulePath = realpathSync(fileURLToPath(import.meta.url));
if (entryPath && entryPath === modulePath) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
