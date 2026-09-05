import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleGrowthSnapshot, fetchGoogleSearchAnalytics, refreshGoogleAccessToken } from "./growth-google-shadow.mjs";

const dailyPayload = {
  rows: [
    { keys: ["2026-08-30"], clicks: 2, impressions: 20, ctr: 0.1, position: 4 },
    { keys: ["2026-08-31"], clicks: 3, impressions: 30, ctr: 0.1, position: 5 },
  ],
};
const pagePayload = {
  rows: [
    { keys: ["https://geosub.org/zh/ai-pricing/chatgpt"], clicks: 2, impressions: 20, position: 4 },
    { keys: ["https://geosub.org/zh/ai-pricing/chatgpt"], clicks: 1, impressions: 10, position: 6 },
    { keys: ["https://other.example/private"], clicks: 99, impressions: 99, position: 1 },
  ],
};

test("Google Search Console snapshot keeps daily totals and merges page rows", () => {
  const snapshot = buildGoogleGrowthSnapshot({
    dailyPayload,
    pagePayload,
    startDate: "2026-08-30",
    endDate: "2026-08-31",
    collectedAt: "2026-09-04T01:00:00Z",
  });
  assert.equal(snapshot.status, "partial");
  assert.deepEqual(snapshot.daily.map((row) => row.date), ["2026-08-30", "2026-08-31"]);
  assert.deepEqual(snapshot.pages.rows, [{ path: "/zh/ai-pricing/chatgpt", clicks: 3, impressions: 30, averagePosition: 4.666666666666667 }]);
  assert.equal(snapshot.querySummary.availableRows, null);
});

test("Google Search Analytics requests final web data with bounded rows", async () => {
  let seen;
  const result = await fetchGoogleSearchAnalytics({
    accessToken: "access-token",
    siteUrl: "https://geosub.org/",
    startDate: "2026-08-30",
    endDate: "2026-08-31",
    dimensions: ["date"],
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => dailyPayload };
    },
  });
  assert.equal(result.rows.length, 2);
  assert.match(seen.url, /searchAnalytics\/query$/);
  assert.equal(JSON.parse(seen.init.body).dataState, "final");
  assert.equal(JSON.parse(seen.init.body).rowLimit, 25000);
});

test("Google refresh token exchange validates the access token response", async () => {
  let seen;
  const result = await refreshGoogleAccessToken({
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ access_token: "new-access-token" }) };
    },
  });
  assert.equal(result.access_token, "new-access-token");
  assert.equal(seen.url, "https://oauth2.googleapis.com/token");
  assert.match(String(seen.init.body), /grant_type=refresh_token/);
});

test("domain property requests preserve the property and filter unrelated hosts", async () => {
  let seen;
  await fetchGoogleSearchAnalytics({accessToken:"test", siteUrl:"sc-domain:geosub.org", startDate:"2026-08-30", endDate:"2026-08-31", dimensions:["date"], fetchImpl:async url=>{seen=url;return {ok:true,json:async()=>dailyPayload};}});
  assert.match(seen, /sites\/sc-domain%3Ageosub.org\/searchAnalytics/);
  const snapshot = buildGoogleGrowthSnapshot({dailyPayload,pagePayload:{rows:[...pagePayload.rows,{keys:["https://private.geosub.org/en/private"],clicks:1,impressions:2}]},siteUrl:"sc-domain:geosub.org",startDate:"2026-08-30",endDate:"2026-08-31"});
  assert.equal(snapshot.site,"sc-domain:geosub.org");
  assert.equal(snapshot.pages.rows.length,1);
  assert.equal(snapshot.settledThrough,null);
  assert.ok(snapshot.limitations.some(x=>x.includes("subdomains")));
  await assert.rejects(fetchGoogleSearchAnalytics({accessToken:"test",siteUrl:"sc-domain:other.example",startDate:"2026-08-30",endDate:"2026-08-31",dimensions:["date"],fetchImpl:()=>assert.fail("must not fetch")}),/GeoSub property/);
});
