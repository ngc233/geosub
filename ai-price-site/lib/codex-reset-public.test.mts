import assert from "node:assert/strict";
import test from "node:test";
import { emptyResetFacts, type ResetFeedItem } from "./codex-reset.ts";
import {
  parseResetQuery, resetActionText, resetScopeText, resetStatusLabel, resetTimeText,
} from "./codex-reset-presentation.ts";
import { escapeResetXml, renderResetRss, resetFeedResponse } from "./codex-reset-rss.ts";

const id = "11111111-1111-4111-8111-111111111111";
function item(version = 1): ResetFeedItem {
  const facts = emptyResetFacts();
  facts.title = { zh: "测试预告", en: "Test announcement" };
  facts.summary = { zh: "尚未确认开始", en: "Not confirmed to have started" };
  return { eventId: id, notificationVersion: version, revision: version,
    guid: `urn:geosub:codex-reset:${id}:${version}`, publishedAt: `2026-10-31T10:${String(version).padStart(2, "0")}:00Z`,
    facts, changeKind: version === 1 ? "initial" : "progress", superseded: false, currentChangeKind: "progress" };
}

test("unknown scope/actions and imprecise dates stay unknown in both languages", () => {
  const facts = emptyResetFacts();
  assert.equal(resetScopeText(facts.scope.plans, "zh"), "未说明");
  assert.equal(resetScopeText(facts.scope.regions, "en"), "Not specified");
  assert.equal(resetActionText(facts, "zh"), "是否需要操作未说明");
  assert.equal(resetTimeText(facts.times.expires, "en"), "Not specified");
  const date = { precision: "date" as const, value: "2026-11-01", timeZone: "", text: { zh: "", en: "" } };
  assert.equal(resetTimeText(date, "en"), "2026-11-01 (Source time zone not specified)");
  const vague = { ...date, precision: "approximate" as const, value: "", text: { zh: "近期", en: "soon" } };
  assert.equal(resetTimeText(vague, "en"), "soon");
  assert.doesNotMatch(resetTimeText(vague, "zh"), /UTC|\d/);
});

test("announcements, grants, rules and mixed audiences have distinct labels", () => {
  const facts = emptyResetFacts();
  assert.equal(resetStatusLabel(facts, "en"), "Announced");
  facts.eventType = "banked_reset_grant";
  facts.eventStatus = "source_confirmed_complete";
  assert.equal(resetStatusLabel(facts, "zh"), "来源确认完成");
  assert.doesNotMatch(resetStatusLabel(facts, "en"), /restored/i);
  facts.eventType = "rule_change";
  assert.equal(resetStatusLabel(facts, "en"), "Source confirms effective");
  facts.eventType = "automatic_reset";
  facts.eventStatus = "rolling_out";
  facts.groups = [
    { label: { zh: "甲组", en: "Group A" }, status: "source_confirmed_complete", evidenceId: id },
    { label: { zh: "乙组", en: "Group B" }, status: "rolling_out", evidenceId: id },
  ];
  assert.equal(resetStatusLabel(facts, "en"), "Partially complete");
  assert.equal(resetStatusLabel(facts, "zh", "rolling_out"), "发放中");
  const record = item(); record.facts = facts;
  const rss = renderResetRss([record], "en", "https://geosub.org");
  assert.match(rss, /Group A: Source confirms completion/);
  assert.match(rss, /Group B: Rolling out/);
});

test("query parsing bounds pagination and requires a singular stable event ID", () => {
  assert.deepEqual(parseResetQuery({}), { page: 1 });
  assert.deepEqual(parseResetQuery({ event: id, page: "2" }), { page: 2, eventId: id });
  for (const bad of ["0", "-1", "1e3", "9999999", "1.5", "<script>"]) assert.equal(parseResetQuery({ page: bad }), null);
  assert.equal(parseResetQuery({ event: [id, id] }), null);
  assert.equal(parseResetQuery({ event: "------------------------------------" }), null);
  assert.equal(parseResetQuery({ page: ["1", "2"] }), null);
});

test("RSS preserves unique notification identity and event links across repeats and language", () => {
  const first = item(), second = item(2);
  second.facts.eventStatus = "source_confirmed_complete";
  const xml = renderResetRss([first, second, first], "en", "https://geosub.org/path");
  assert.equal((xml.match(/<item>/g) || []).length, 2);
  assert.match(xml, new RegExp(first.guid));
  assert.match(xml, new RegExp(second.guid));
  assert.match(xml, new RegExp(`https://geosub.org/en/tools/codex-reset\\?event=${id}#event-${id}`));
  assert.match(xml, /<language>en<\/language>/);
  assert.match(renderResetRss([first], "zh", "https://geosub.org"), new RegExp(first.guid));
  assert.ok(xml.indexOf(second.guid) < xml.indexOf(first.guid));
  assert.equal(xml, renderResetRss([first, second], "en", "https://geosub.org"));
});

test("RSS XML escapes untrusted text and removes illegal characters without executing markup", () => {
  const value = `<script>alert("x")</script>&'\u0000\ud800🟢`;
  assert.equal(escapeResetXml(value), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&apos;🟢");
  const record = item(); record.facts.title.en = value;
  const xml = renderResetRss([record], "en", "https://geosub.org");
  assert.doesNotMatch(xml, /<script>|\u0000|\ud800/);
  assert.match(xml, /&lt;script&gt;/);
});

test("correction and withdrawal suppress old conclusions while keeping GUID and dates", () => {
  const record = item(); record.facts.title.en = "Incorrect personal restoration";
  record.facts.summary.en = "WRONG_CLAIM";
  record.superseded = true; record.currentChangeKind = "correction";
  const corrected = renderResetRss([record], "en", "https://geosub.org");
  assert.doesNotMatch(corrected, /WRONG_CLAIM|Incorrect personal restoration/);
  assert.match(corrected, /Corrected/);
  record.currentChangeKind = "withdrawal";
  const withdrawn = renderResetRss([record], "en", "https://geosub.org");
  assert.doesNotMatch(withdrawn, /WRONG_CLAIM/);
  assert.match(withdrawn, /withdrawn/);
  assert.match(withdrawn, new RegExp(record.guid));
  assert.match(withdrawn, /Sat, 31 Oct 2026 10:01:00 GMT/);
});

test("feed conditional response uses representation ETag; off state cannot return cached public data", async () => {
  const request = new Request("https://geosub.org/en/tools/codex-reset/rss.xml");
  const response = resetFeedResponse(request, { enabled: true, items: [item()] }, "en", "https://geosub.org");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /application\/rss\+xml/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  const etag = response.headers.get("etag")!;
  const conditional = new Request(request, { headers: { "if-none-match": `W/${etag}` } });
  const unchanged = resetFeedResponse(conditional, { enabled: true, items: [item()] }, "en", "https://geosub.org");
  assert.equal(unchanged.status, 304); assert.equal(await unchanged.text(), "");
  const changed = item(); changed.facts.summary.en = "Editorial correction";
  assert.equal(resetFeedResponse(conditional, { enabled: true, items: [changed] }, "en", "https://geosub.org").status, 200);
  const disabled = resetFeedResponse(conditional, { enabled: false, items: [item()] }, "en", "https://geosub.org");
  assert.equal(disabled.status, 404); assert.equal(disabled.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await disabled.text(), /Test announcement/);
});

test("feed retains at most 100 latest notifications", () => {
  const items = Array.from({ length: 105 }, (_, index) => ({ ...item(), notificationVersion: index + 1,
    guid: `test:${index}`, publishedAt: new Date(Date.UTC(2026, 9, 31, 0, index)).toISOString() }));
  const xml = renderResetRss(items, "en", "https://geosub.org");
  assert.equal((xml.match(/<item>/g) || []).length, 100);
  assert.doesNotMatch(xml, /<guid isPermaLink="false">test:0<\/guid>/);
});
