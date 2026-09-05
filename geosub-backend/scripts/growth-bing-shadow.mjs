#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BING_GROWTH_CONTRACT_VERSION = "growth-metrics.v1";
export const BING_API_BASE_URL =
  process.env.GEOSUB_BING_API_BASE_URL ||
  "https://www.bing.com/webmaster/api.svc/json";
export const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function count(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
  return parsed;
}

export function parseBingDate(value) {
  const match = String(value || "").match(/^\/Date\((\d+)([+-]\d{4})?\)\/$/);
  if (!match) throw new Error("Bing returned an invalid date value.");
  const date = new Date(Number(match[1]));
  if (Number.isNaN(date.getTime())) throw new Error("Bing returned an invalid date value.");
  return date.toISOString().slice(0, 10);
}

function parseEnvelope(payload, method) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.d)) {
    throw new Error(`Bing ${method} response shape is invalid.`);
  }
  return payload.d;
}

export async function fetchBingJson({
  accessToken,
  siteUrl,
  method,
  fetchImpl = globalThis.fetch,
}) {
  assertString(accessToken, "Bing access token");
  assertString(siteUrl, "Bing site URL");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const url = `${BING_API_BASE_URL}/${method}?siteUrl=${encodeURIComponent(siteUrl)}`;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Bing ${method} request failed with HTTP ${response.status}.`);
  }
  return parseEnvelope(await response.json(), method);
}

export async function refreshBingAccessToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = globalThis.fetch,
}) {
  assertString(clientId, "Bing client ID");
  assertString(clientSecret, "Bing client secret");
  assertString(refreshToken, "Bing refresh token");
  const response = await fetchImpl(BING_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Bing refresh request failed with HTTP ${response.status}.`);
  }
  const payload = await response.json();
  if (!payload || typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Bing refresh response did not contain an access token.");
  }
  return payload;
}

function publicPath(value, siteUrl) {
  try {
    const url = new URL(String(value || ""), siteUrl);
    const site = new URL(siteUrl);
    if (url.hostname.toLowerCase().replace(/^www\./, "") !== site.hostname.toLowerCase().replace(/^www\./, "")) return null;
    if (!/^\/(?:zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?:\/|$)/.test(url.pathname)) return null;
    return url.pathname.replace(/\/$/, "") || "/zh";
  } catch {
    return null;
  }
}

export function buildBingGrowthSnapshot({
  dailyRows,
  pageRows,
  queryRows,
  siteUrl = "https://geosub.org/",
  collectedAt = new Date().toISOString(),
}) {
  const daily = dailyRows.map((row) => ({
    date: parseBingDate(row.Date),
    clicks: count(row.Clicks, "Bing clicks"),
    impressions: count(row.Impressions, "Bing impressions"),
  })).sort((a, b) => a.date.localeCompare(b.date));
  if (!daily.length) throw new Error("Bing returned no daily traffic rows.");
  if (daily.some((row) => row.clicks > row.impressions)) throw new Error("Bing clicks exceed impressions.");

  const pageBuckets = new Map();
  pageRows.forEach((row) => {
    const pathValue = publicPath(row.Query, siteUrl);
    if (!pathValue) return;
    const clicks = count(row.Clicks, "Bing page clicks");
    const impressions = count(row.Impressions, "Bing page impressions");
    if (clicks > impressions) return;
    const position = row.AvgImpressionPosition == null ? undefined : Number(row.AvgImpressionPosition);
    const validPosition = Number.isFinite(position) && position >= 0 && position <= 1000 ? position : undefined;
    const existing = pageBuckets.get(pathValue) || { path: pathValue, clicks: 0, impressions: 0, positionWeighted: 0, positionWeight: 0 };
    existing.clicks += clicks;
    existing.impressions += impressions;
    if (validPosition !== undefined && impressions > 0) {
      existing.positionWeighted += validPosition * impressions;
      existing.positionWeight += impressions;
    }
    pageBuckets.set(pathValue, existing);
  });
  const pages = [...pageBuckets.values()].map(({ path: pathValue, clicks, impressions, positionWeighted, positionWeight }) => ({
    path: pathValue, clicks, impressions,
    ...(positionWeight > 0 ? { averagePosition: positionWeighted / positionWeight } : {}),
  })).sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path));

  return {
    schemaVersion: BING_GROWTH_CONTRACT_VERSION,
    source: "bing_webmaster",
    site: siteUrl,
    periodStart: daily[0].date,
    periodEnd: daily.at(-1).date,
    settledThrough: null,
    sourceTimezone: "unknown",
    collectedAt,
    status: "partial",
    sampling: { kind: "provider_reporting", missingShare: null },
    contractVersion: BING_GROWTH_CONTRACT_VERSION,
    endpointKind: "legacy_json",
    daily,
    pages: { availableRows: pages.length, rows: pages.slice(0, 500) },
    querySummary: { availableRows: queryRows.length },
    limitations: [
      "Bing daily traffic is available, but provider settlement is not asserted by this adapter.",
      "Bing page and query details are reported separately from site totals and may update weekly.",
      "The currently verified endpoint is the legacy JSON service; REST endpoint migration remains a deployment gate.",
    ],
  };
}

export async function collectBingGrowthSnapshot({
  accessToken,
  siteUrl = "https://geosub.org/",
  collectedAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
}) {
  const [dailyRows, pageRows, queryRows] = await Promise.all([
    fetchBingJson({ accessToken, siteUrl, method: "GetRankAndTrafficStats", fetchImpl }),
    fetchBingJson({ accessToken, siteUrl, method: "GetPageStats", fetchImpl }),
    fetchBingJson({ accessToken, siteUrl, method: "GetQueryStats", fetchImpl }),
  ]);
  return buildBingGrowthSnapshot({ dailyRows, pageRows, queryRows, siteUrl, collectedAt });
}

async function resolveBingAccessToken({ tokenFile, fetchImpl = globalThis.fetch }) {
  if (process.env.GEOSUB_BING_ACCESS_TOKEN) return process.env.GEOSUB_BING_ACCESS_TOKEN;
  if (
    process.env.GEOSUB_BING_CLIENT_ID &&
    process.env.GEOSUB_BING_CLIENT_SECRET &&
    process.env.GEOSUB_BING_REFRESH_TOKEN
  ) {
    const refreshed = await refreshBingAccessToken({
      clientId: process.env.GEOSUB_BING_CLIENT_ID,
      clientSecret: process.env.GEOSUB_BING_CLIENT_SECRET,
      refreshToken: process.env.GEOSUB_BING_REFRESH_TOKEN,
      fetchImpl,
    });
    return refreshed.access_token;
  }
  if (!tokenFile) throw new Error("Bing credentials are not configured.");
  const token = JSON.parse(await readFile(tokenFile, "utf8"));
  return assertString(token.access_token, "Bing access token");
}

async function main() {
  const tokenFile = process.env.GEOSUB_BING_TOKEN_FILE;
  const outputFile = process.env.GEOSUB_BING_OUTPUT_FILE;
  const siteUrl = process.env.GEOSUB_BING_SITE_URL || "https://geosub.org/";
  if (!outputFile) throw new Error("GEOSUB_BING_OUTPUT_FILE is required.");
  const accessToken = await resolveBingAccessToken({ tokenFile });
  const snapshot = await collectBingGrowthSnapshot({ accessToken, siteUrl });
  await mkdir(path.dirname(outputFile), { recursive: true, mode: 0o700 });
  await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(JSON.stringify({ status: snapshot.status, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd, dailyRows: snapshot.daily.length, pageRows: snapshot.pages.availableRows, queryRows: snapshot.querySummary.availableRows }) + "\n");
}

const entryPath = process.argv[1] ? realpathSync(process.argv[1]) : null;
const modulePath = realpathSync(fileURLToPath(import.meta.url));
if (entryPath && entryPath === modulePath) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
