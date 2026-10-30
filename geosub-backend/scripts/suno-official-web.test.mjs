import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sunoFixture, assertSunoTestDatabase } from "../tests/suno-scheduler-fixture.mjs";
import {
  assertSunoSource, parseSunoEvidence, fetchSunoSnapshot, sunoPricingUrl,
} from "./lib/suno-official-web.mjs";
import { validateSnapshot } from "./collect-official-web-prices.mjs";
import { describeCollectorCapability } from "./report-collector-capabilities.mjs";

const source = JSON.parse(readFileSync(new URL("../data/official-web-price-sources.json", import.meta.url))).sources["suno-us-monthly"];
const market = source.markets[0];
const parse = html => parseSunoEvidence(html, market);
const response = html => new Response(html, { headers: { "content-type": "text/html" } });

test("Suno uses exact canonical monthly plan identities, never annual equivalents or hardcoded amounts", () => {
  assertSunoSource(source);
  for (const [pro, premier] of [[10, 30], [12.5, 37]]) {
    const result = parse(sunoFixture({ pro, premier }));
    assert.equal(result.complete, true, result.issues.join(","));
    assert.deepEqual(result.candidates.map(c => [c.plan_slug, c.raw_price]), [["pro", pro], ["premier-plan", premier]]);
    assert.ok(result.candidates.every(c => c.currency === "USD" && c.billing_cycle === "monthly" && c.price_type === "list_price"));
  }
});

const mutations = [
  ["annual-only", plans => { plans[1].prices = plans[1].prices.slice(1); }],
  ["currency", plans => { plans[1].prices[0].currency = "CAD"; }],
  ["disagreement", plans => { plans[1].monthly_price_usd = 8; }],
  ["duplicate month", plans => { plans[1].prices.push({ ...plans[1].prices[0] }); }],
  ["duplicate plan", plans => { plans.push({ ...plans[1] }); }],
  ["renamed plan", plans => { plans[1].name = "Pro trial"; }],
  ["changed product ID", plans => { plans[2].id = "unknown"; }],
  ["missing plan", plans => { plans.pop(); }],
  ["extra plan", plans => { plans.push({ plan_key: "enterprise" }); }],
  ["string amount", plans => { plans[1].prices[0].price = "10"; }],
  ["zero", plans => { plans[1].prices[0].price = 0; plans[1].monthly_price_usd = 0; }],
  ["negative", plans => { plans[1].prices[0].price = -1; plans[1].monthly_price_usd = -1; }],
];
for (const [name, mutate] of mutations) test("Suno rejects " + name, () => {
  const result = parse(sunoFixture({ mutate }));
  assert.equal(result.complete, false);
  assert.deepEqual(result.candidates, []);
});

test("Suno rejects missing/conflicting country and unrelated script, comments or duplicate pages", () => {
  const html = sunoFixture();
  for (const bad of [
    sunoFixture({ country: "CA" }), html.replaceAll('\\"country\\":\\"US\\"', '\\"country\\":\\"CA\\"'),
    "<!--" + html + "-->", "<script>const unrelated=" + JSON.stringify(html) + "</script>",
    html + html, html.replace("PricingPage", "OtherPage"), html.replace("geolocation", "location"),
    html.replace("self.__next_f.push(", "self.__next_f.push(execute(),"),
  ]) assert.equal(parse(bad).complete, false);
  assert.equal(parseSunoEvidence(html, { ...market, country_code: "GB" }).complete, false);
});

test("Suno bounded HTTP validates final identity, hash and context before collecting", async () => {
  const snapshot = await fetchSunoSnapshot(market, { fetchImpl: async (url, options) => {
    assert.equal(url, sunoPricingUrl); assert.equal(options.redirect, "manual");
    return response(sunoFixture());
  } });
  assert.deepEqual(validateSnapshot(source, market, snapshot), []);
  for (const patch of [
    { final_url: "https://suno.com/" }, { content_hash: "" }, { evidence_type: "json" },
    { request_context: { country_code: "CA" } }, { render_mode: "browser" },
  ]) assert.ok(validateSnapshot(source, market, { ...snapshot, ...patch }).includes("suno_evidence_context_mismatch"));
  for (const status of [301, 403, 429, 503]) await assert.rejects(
    fetchSunoSnapshot(market, { fetchImpl: async () => new Response("fixture", { status }) }), /unavailable_or_redirected/,
  );
  await assert.rejects(fetchSunoSnapshot(market, { fetchImpl: async () => new Response("{}", {
    headers: { "content-type": "application/json" },
  }) }), /not_html/);
  await assert.rejects(fetchSunoSnapshot(market, { fetchImpl: async () => response("x".repeat(2_000_001)) }), /too_large/);
  await assert.rejects(fetchSunoSnapshot(market, { fetchImpl: async () => {
    const value = response(sunoFixture()); Object.defineProperty(value, "url", { value: "https://suno.com/" }); return value;
  } }), /unavailable_or_redirected/);
});

test("Suno registry and capability remain pending-only and reject altered scope or automatic review", () => {
  const job = { product_slug: "suno", job_config: { collector_kind: "pricing_page", official_web_source_key: "suno-us-monthly" } };
  const capability = describeCollectorCapability(job, { "suno-us-monthly": source });
  assert.equal(capability.collects_prices, true); assert.equal(capability.automatic_review, false);
  assert.equal(capability.mode, "pending_official_web_prices");
  for (const patch of [{ auto_review: {} }, { product_slug: "claude" }, { billing_cycle: "annual" }, { markets: [] }]) {
    assert.throws(() => assertSunoSource({ ...source, ...patch }), /not_allowlisted/);
    assert.equal(describeCollectorCapability(job, { "suno-us-monthly": { ...source, ...patch } }).collects_prices, false);
  }
});

test("Suno HTTP doubles cannot attach to existing or remote databases", () => {
  assertSunoTestDatabase("postgresql://127.0.0.1:55433/geosub_collector_test_suno_fixture");
  for (const value of [undefined, "invalid", "postgresql://localhost:55433/geosub_admin_preview_20261028",
    "postgresql://remote.invalid:55433/geosub_collector_test_suno_fixture",
    "postgresql://localhost:5432/geosub_collector_test_suno_fixture"]) {
    assert.throws(() => assertSunoTestDatabase(value), /isolated_suno_database_required/);
  }
  const result = spawnSync(process.execPath, ["--import", fileURLToPath(new URL("../tests/suno-scheduler-fixture.mjs", import.meta.url)),
    "--eval", "throw Error('must_not_run')"], {
    encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "", GEOSUB_SUNO_FIXTURE: "1",
      DATABASE_URL: "postgresql://127.0.0.1:55433/geosub_admin_preview_20261028" },
  });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /isolated_suno_database_required/);
  assert.doesNotMatch(result.stderr, /must_not_run/);
});
