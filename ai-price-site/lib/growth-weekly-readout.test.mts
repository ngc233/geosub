import test from "node:test";
import assert from "node:assert/strict";
import { assertGrowthLocalDatabase, growthSearchImportBatch, validateGrowthSearchEvidence, type GrowthSearchEvidence } from "./growth-search-evidence.ts";
import { buildGrowthWeeklyReadout, type GrowthFirstPartyEvidence } from "./growth-weekly-readout.ts";
import { appendSeoSearchPageImportBatch, parseSeoSearchPageImportState } from "./seo-search-observation-import.ts";
import { buildDailyGrowthSnapshot } from "./growth-intelligence.ts";

function evidence(engine: "google" | "bing" = "google"): GrowthSearchEvidence {
  return { schemaVersion: "growth-search-evidence.v1", site: "https://geosub.org", engine,
    searchType: engine === "bing" ? "web_and_chat" : "web", sourceTimezone: "provider_report_date_unknown",
    method: "browser_observation", collectedAt: "2026-09-03T00:00:00Z", periodStart: "2026-08-18", periodEnd: "2026-08-31", settledThrough: null,
    days: Array.from({ length: 14 }, (_, index) => ({ date: `2026-08-${index + 18}`, clicks: index < 7 ? 1 : 2, impressions: 10 })),
    pages: { searchType: "web", coverage: "selected_rows", availableRows: 200,
      rows: [{ path: "/en/ai-pricing/chatgpt/plus", clicks: 100, impressions: 200 },
        { path: "/zh/ai-pricing/chatgpt/plus", clicks: 98, impressions: null, impressionsDisplay: "3.2K" }] } };
}
function firstParty(): GrowthFirstPartyEvidence {
  return { metric: "cookieless_page_views", sourceTimezone: "UTC", databaseSnapshotAt: "2026-09-02T23:00:00Z",
    collectedAt: "2026-09-03T00:00:00Z", days: Array.from({ length: 11 }, (_, i) => ({ date: `2026-08-${i + 21}`, value: 10 })) };
}
function report() {
  return buildGrowthWeeklyReadout({ evidence: [evidence(), evidence("bing")], firstParty: firstParty(),
    endDate: "2026-08-31", generatedAt: "2026-09-03T01:00:00Z", experimentLocks: [] });
}

test("source validation rejects unsupported scopes, false finality, invalid dates, duplicates, and bad counts", () => {
  for (const modify of [
    (e: Record<string, unknown>) => { e.site = "https://wrong.example"; },
    (e: Record<string, unknown>) => { e.searchType = "web_and_chat"; },
    (e: Record<string, unknown>) => { e.settledThrough = "2026-08-31"; },
    (e: Record<string, unknown>) => { e.periodStart = "2026-02-30"; },
    (e: Record<string, unknown>) => { e.rawQuery = "someone@example.org"; },
  ]) { const data = structuredClone(evidence()) as unknown as Record<string, unknown>; modify(data); assert.throws(() => validateGrowthSearchEvidence(data)); }
  const duplicate = evidence(); duplicate.days.push(duplicate.days[0]); assert.throws(() => validateGrowthSearchEvidence(duplicate), /Duplicate/);
  const badCount = evidence(); badCount.days[0].clicks = 11; assert.throws(() => validateGrowthSearchEvidence(badCount), /exceed/);
  const badPath = evidence(); badPath.pages.rows[0].path += "?token=private"; assert.throws(() => validateGrowthSearchEvidence(badPath), /canonical public/);
});

test("rounded page counts are preserved as unknown and excluded from exact import; provenance round-trips", () => {
  const batch = growthSearchImportBatch(evidence("bing"));
  assert.equal(batch.observations.length, 1);
  assert.equal(batch.evidence?.excludedRoundedRows, 1);
  const state = appendSeoSearchPageImportBatch({ version: 1, batches: [] }, batch);
  assert.deepEqual(parseSeoSearchPageImportState(JSON.stringify(state)), state);
  assert.deepEqual(appendSeoSearchPageImportBatch(state, batch), state);
  const reordered = evidence("bing"); reordered.days.reverse(); reordered.pages.rows.reverse();
  assert.equal(growthSearchImportBatch(reordered).id, batch.id);
});

test("weekly site metrics do not use page sums or cross-source totals", () => {
  const r = report();
  const clicks = r.metrics.find((m) => m.source === "google" && m.metric === "clicks")!;
  assert.equal(clicks.previous.total, 7); assert.equal(clicks.current.total, 14);
  assert.equal(clicks.observedDelta, 7); assert.equal(clicks.observedPercentChange, 100);
  assert.equal(r.metrics.find((m) => m.source === "bing")?.scope, "web_and_chat");
  assert.equal(r.metrics.length, 5);
  assert.equal(r.pageObservations.find((s) => s.engine === "bing")?.searchType, "web");
});

test("missing days never become zero or a valid weekly comparison", () => {
  const row = report().metrics.find((m) => m.source === "first_party")!;
  assert.equal(row.previous.total, null); assert.equal(row.previous.observedTotal, 40);
  assert.deepEqual(row.previous.missingDates, ["2026-08-18", "2026-08-19", "2026-08-20"]);
  assert.equal(row.current.total, 70); assert.equal(row.observedDelta, null);
});

test("zero denominator yields no relative change, and source gaps remain explicit", () => {
  const g = evidence(); g.days.forEach((d, i) => { if (i < 7) d.clicks = 0; }); g.days.pop();
  const r = buildGrowthWeeklyReadout({ evidence: [g, evidence("bing")], firstParty: firstParty(), endDate: "2026-08-31", generatedAt: "2026-09-03T01:00:00Z", experimentLocks: [] });
  assert.equal(r.metrics.find((m) => m.source === "google" && m.metric === "clicks")?.observedPercentChange, null);
  assert.equal(r.dailySnapshots.at(-1)?.sources.find((s) => s.source === "google_search_console")?.facts, null);
});

test("browser observations cannot authorize growth actions; stable report hash includes inputs and locks", () => {
  const r = report(); assert.equal(r.status, "partial"); assert.equal(r.comparisonReady, false); assert.equal(r.actionable, false);
  assert(r.dailySnapshots.every((day) => !day.settled && day.sources.every((s) => s.settledThrough === null)));
  const args = { evidence: [evidence("bing"), evidence()], firstParty: firstParty(), endDate: "2026-08-31", generatedAt: "2026-09-04T01:00:00Z", experimentLocks: [] };
  assert.equal(buildGrowthWeeklyReadout(args).reportHash, r.reportHash);
  args.firstParty.days[0].value += 1;
  assert.notEqual(buildGrowthWeeklyReadout(args).reportHash, r.reportHash);
});

test("unknown settlement downgrades even a complete source instead of inventing a date", () => {
  const d = buildDailyGrowthSnapshot({ date: "2026-08-31", generatedAt: "2026-09-03T01:00:00Z", comparisonKey: "test",
    sources: [{ source: "google_search_console", periodStart: "2026-08-31", periodEnd: "2026-08-31", settledThrough: null,
      sourceTimezone: "unknown", collectedAt: "2026-09-03T00:00:00Z", status: "complete", sampling: { kind: "test", missingShare: null }, contractVersion: "test", facts: { clicks: 1 } }] });
  assert.equal(d.status, "partial"); assert.equal(d.settled, false);
});

test("local importer rejects production, non-project databases, and URL connection overrides", () => {
  assert.doesNotThrow(() => assertGrowthLocalDatabase("postgresql://test@127.0.0.1:5433/geosub_app?schema=public"));
  for (const url of ["postgresql://test@production.example/geosub_app", "postgresql://test@127.0.0.1/postgres",
    "postgresql://test@127.0.0.1/geosub_app?host=production.example", "postgresql://test@127.0.0.1/geosub_app?options=x"]) {
    assert.throws(() => assertGrowthLocalDatabase(url));
  }
});
