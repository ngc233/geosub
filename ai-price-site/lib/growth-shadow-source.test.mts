import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readGrowthShadowSource, summarizeGrowthShadow } from "./growth-shadow-source.ts";

const now = new Date("2026-09-05T12:00:00Z");
function snapshot(engine: "google" | "bing" = "google") {
  return {
    schemaVersion:"growth-metrics.v1", contractVersion:"growth-metrics.v1",
    source: engine === "google" ? "google_search_console" : "bing_webmaster",
    site: engine === "google" ? "sc-domain:geosub.org" : "https://geosub.org/",
    periodStart:"2026-08-31", periodEnd:"2026-09-02", collectedAt:"2026-09-05T10:00:00Z",
    settledThrough:null, status:"partial", sourceTimezone:engine === "google" ? "America/Los_Angeles" : "unknown",
    sampling:{kind:"provider_final",missingShare:null}, endpointKind:engine === "google" ? "search_analytics" : "legacy_json",
    daily:[{date:"2026-08-31",clicks:4,impressions:40},{date:"2026-09-02",clicks:6,impressions:60}],
    pages:{availableRows:1,rows:[{path:"/en/ai-pricing/claude/pro",clicks:1,impressions:5}]},
    querySummary:{availableRows:0}, limitations:[],
  };
}
async function fixture(run: (directory: string) => Promise<void>) {
  const dir=await mkdtemp(path.join(tmpdir(),"growth-source-"));
  try { await run(dir); } finally { await rm(dir,{recursive:true,force:true}); }
}
for (const engine of ["google","bing"] as const) {
  test(`${engine} live summary uses daily totals, preserves gaps and source semantics`,()=>fixture(async dir=>{
    await writeFile(path.join(dir,`${engine}-shadow-latest.json`),JSON.stringify(snapshot(engine)));
    const result=summarizeGrowthShadow(await readGrowthShadowSource(engine,now,dir),now)!;
    assert.equal(result.totals.clicks,10);assert.equal(result.totals.impressions,100);
    assert.equal(result.pages[0].clicks,1);assert.equal(result.collection.missingDays,1);
    assert.equal(result.status,"partial");assert.equal(result.settledThrough,null);
    assert.equal(result.collection.searchType,engine === "google" ? "web" : "web_and_chat");
    assert.equal(result.collection.state,"fresh");
  }));
}
test("reads the replaced snapshot without restart and labels the last success stale",()=>fixture(async dir=>{
  const file=path.join(dir,"google-shadow-latest.json");
  const value=snapshot();await writeFile(file,JSON.stringify(value));
  assert.equal(summarizeGrowthShadow(await readGrowthShadowSource("google",now,dir),now)!.totals.clicks,10);
  value.daily[0].clicks=7;value.collectedAt="2026-09-03T11:59:59Z";await writeFile(file,JSON.stringify(value));
  const result=summarizeGrowthShadow(await readGrowthShadowSource("google",now,dir),now)!;
  assert.equal(result.totals.clicks,13);assert.equal(result.collection.state,"stale");
}));
test("missing, corrupt, future, duplicate and credential-bearing files fail closed",()=>fixture(async dir=>{
  assert.equal((await readGrowthShadowSource("google",now,dir)).state,"missing");
  for(const value of ["{broken",JSON.stringify({...snapshot(),client_secret:"must-not-leak"}),JSON.stringify({...snapshot(),collectedAt:"2026-09-06T10:00:00Z"}),JSON.stringify({...snapshot(),daily:[snapshot().daily[0],snapshot().daily[0]]}),JSON.stringify({...snapshot(),site:"sc-domain:other.example"})," ".repeat(4*1024*1024+1)]) {
    await writeFile(path.join(dir,"google-shadow-latest.json"),value);
    const result=await readGrowthShadowSource("google",now,dir);
    assert.equal(result.state,"invalid");assert.equal(result.evidence,null);
    assert.equal(JSON.stringify(result).includes("must-not-leak"),false);
  }
}));
