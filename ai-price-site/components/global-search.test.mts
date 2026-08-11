import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getProductSearchAliases,
  normalizeSearchText,
  scoreSearchText,
} from "../lib/public-search.ts";

const root = new URL("../", import.meta.url);

async function source(path: string) {
  return readFile(new URL(path, root), "utf8");
}

test("public search matches compact names, aliases and non-Latin queries", () => {
  assert.equal(normalizeSearchText("ChatGPT Plus"), "chatgptplus");
  assert.equal(normalizeSearchText("Währungsrechner"), "wahrungsrechner");
  assert.ok(scoreSearchText("chatgptplus", ["ChatGPT Plus"]) >= 95);
  assert.ok(scoreSearchText("奈飞", ["Netflix", "奈飞", "网飞"]) >= 95);
  assert.equal(scoreSearchText("x", ["ChatGPT"]), 0);
  assert.ok(getProductSearchAliases("hbo-max").includes("hbomax"));
});

test("public search tolerates cautious product-name typos", () => {
  assert.ok(scoreSearchText("chatgtp", ["ChatGPT"]) >= 60);
  assert.ok(scoreSearchText("netlfix", ["Netflix"]) >= 60);
  assert.ok(scoreSearchText("perpelxity", ["Perplexity"]) >= 60);
  assert.equal(scoreSearchText("max", ["Manus"]), 0);
  assert.equal(scoreSearchText("netflix", ["Next.js"]), 0);
  assert.equal(scoreSearchText("ai", ["ChatGPT"]), 0);
});

test("public search API exposes only published customer-facing records", async () => {
  const api = await source("app/api/search/route.ts");

  assert.match(api, /status:\s*PublishStatus\.PUBLISHED/);
  assert.match(api, /status:\s*ArticleStatus\.PUBLISHED/);
  assert.match(api, /noindex:\s*false/);
  assert.match(api, /deletedAt:\s*null/);
  assert.match(api, /regionPrices:\s*\{\s*some:\s*\{\s*status:\s*PublishStatus\.PUBLISHED/);
  assert.match(api, /"X-Robots-Tag":\s*"noindex, nofollow"/);
  assert.match(api, /MAX_QUERY_LENGTH\s*=\s*80/);
  assert.match(api, /MAX_RESULTS\s*=\s*10/);
  assert.match(api, /getPlanResultTitle/);
  assert.match(api, /officialUrl:\s*true/);
  assert.match(api, /unstable_cache/);
  assert.match(api, /public-search-products-v1/);
  assert.match(api, /public-search-articles-v1/);
  assert.match(api, /revalidate:\s*300/);
  assert.match(api, /request\.nextUrl\.searchParams\.get\("popular"\)\s*===\s*"1"/);
  assert.match(api, /"event_key"\s*=\s*'search_digital_service'/);
  assert.match(api, /HAVING COUNT\(\*\)\s*>=\s*3/);
  assert.match(api, /COUNT\(DISTINCT COALESCE\("session_id",\s*"anonymous_id"\)\)\s*>=\s*2/);
  assert.match(api, /public-search-popular-v1/);
  assert.match(api, /revalidate:\s*900/);
  assert.doesNotMatch(api, /"event_key"\s+IN\s+\('search_digital_service',\s*'search_no_result'\)/);
});

test("global search is shared by the header and supports every launched locale", async () => {
  const [header, search, locale] = await Promise.all([
    source("components/Header.tsx"),
    source("components/GlobalSearch.tsx"),
    source("lib/site-locale.ts"),
  ]);

  assert.match(header, /<GlobalSearch locale=\{currentLocaleCode\}\s*\/>/);
  assert.match(search, /Record<PreparedSiteLocale,\s*SearchCopy>/);
  assert.match(search, /role="dialog"/);
  assert.match(search, /onClick=\{\(event\) => \{/);
  assert.match(search, /event\.key === "Escape"/);
  assert.match(search, /event\.key === "ArrowDown"/);
  assert.match(search, /function trackSearchResult/);
  assert.match(search, /visibleResults/);
  assert.match(search, /setResultKind/);
  assert.match(search, /aria-pressed=\{resultKind === kind\}/);
  assert.match(search, /popularTerms/);
  assert.match(search, /popularLoaded/);
  assert.match(search, /\/api\/search\?popular=1/);
  assert.match(search, /copy\.popular/);

  const launchedBlock = locale.match(/export const launchedSiteLocales = \[([\s\S]*?)\] as const/);
  assert.ok(launchedBlock);
  for (const localeCode of ["zh", "zh-tw", "en", "ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
    assert.match(launchedBlock[1], new RegExp(`"${localeCode.replace("-", "\\-")}"`));
    assert.match(search, new RegExp(`\\n\\s*["']?${localeCode.replace("-", "\\-")}["']?:\\s*\\{`));
  }
});

test("search analytics records useful demand without creating indexable result pages", async () => {
  const [search, analyticsEvents, analyticsProvider, analyticsSession] = await Promise.all([
    source("components/GlobalSearch.tsx"),
    source("lib/analytics-events.ts"),
    source("components/analytics/AnalyticsProvider.tsx"),
    source("lib/client-analytics-session.ts"),
  ]);

  assert.match(search, /search_digital_service/);
  assert.match(search, /search_no_result/);
  assert.match(search, /resultCount/);
  assert.match(search, /hasAnalyticsConsent\(\)/);
  assert.match(search, /getAnalyticsSessionId\(\)/);
  assert.match(analyticsProvider, /getAnalyticsSessionId\(\)/);
  assert.match(analyticsProvider, /consent !== ANALYTICS_CONSENT_GRANTED/);
  assert.match(analyticsSession, /SESSION_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(analyticsSession, /!hasAnalyticsConsent\(\)/);
  assert.match(analyticsEvents, /CLICK_SEARCH_RESULT:\s*"click_search_result"/);
  assert.doesNotMatch(search, /href:\s*[`"'][^`"']*\/search/);
  for (const localeCode of ["tr", "ar", "fr", "it", "pt"]) {
    assert.match(analyticsProvider, new RegExp(`"${localeCode}"`));
  }
});
