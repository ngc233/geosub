import assert from "node:assert/strict";
import test from "node:test";
import { emptyResetFacts, parseResetFacts, resetInstant, resetNeedsNotification, resetUrl } from "./codex-reset.ts";

function fixture() {
  const facts = emptyResetFacts();
  facts.title = { zh: "额外重置预告", en: "Extra reset announced" };
  facts.summary = { zh: "官方预告，范围未说明。", en: "Official announcement; scope unspecified." };
  return facts;
}
test("unknown scope and imprecise dates cannot silently become concrete facts", () => {
  const facts = fixture();
  assert.equal(parseResetFacts(facts, true).scope.plans.kind, "unknown");
  facts.scope.plans.detail.en = "All plans";
  assert.throws(() => parseResetFacts(facts, true), /未知范围/);
  const dates = fixture();
  dates.times.effective.value = "2026-10-31T12:00:00Z";
  assert.throws(() => parseResetFacts(dates), /未知或模糊/);
  dates.times.effective.precision = "date";
  dates.times.effective.value = "2026-02-30";
  assert.throws(() => parseResetFacts(dates), /日期无效/);
});
test("publication requires both languages and supported action guidance", () => {
  const facts = fixture();
  facts.title.en = "";
  assert.throws(() => parseResetFacts(facts, true));
  facts.title.en = "Announcement";
  facts.action.kind = "required";
  assert.throws(() => parseResetFacts(facts, true));
  assert.throws(() => resetUrl("javascript:alert(1)"));
  assert.throws(() => resetUrl("https://user:pass@openai.com"));
});
test("a completed subgroup never completes the whole event", () => {
  const facts = fixture();
  facts.eventStatus = "source_confirmed_complete";
  facts.groups = [
    { label: { zh: "甲", en: "A" }, status: "source_confirmed_complete", evidenceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    { label: { zh: "乙", en: "B" }, status: "rolling_out", evidenceId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
  ];
  assert.throws(() => parseResetFacts(facts, true), /部分人群/);
  facts.eventStatus = "rolling_out";
  assert.equal(parseResetFacts(facts, true).eventStatus, "rolling_out");
});
test("editorial changes cannot suppress factual transitions; correction always notifies", () => {
  const before = fixture(), after = fixture();
  after.title.en = "Reworded announcement";
  assert.equal(resetNeedsNotification(before, after, "editorial"), false);
  after.eventStatus = "rolling_out";
  assert.throws(() => resetNeedsNotification(before, after, "editorial"), /事实字段/);
  assert.equal(resetNeedsNotification(before, after, "progress"), true);
  assert.equal(resetNeedsNotification(before, before, "correction"), true);
});
test("new corroborating group evidence does not emit a duplicate notification", () => {
  const before = fixture();
  before.groups = [{ label: { zh: "甲", en: "A" }, status: "announced", evidenceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }];
  const after = structuredClone(before);
  after.groups[0].evidenceId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  assert.equal(resetNeedsNotification(before, after, "progress"), false);
});
test("editorial cannot hide scope, instructions, approximate deadlines, or subgroup changes", () => {
  const before = fixture();
  before.scope.plans = { kind: "limited", detail: { zh: "Plus", en: "Plus" } };
  before.action = { kind: "required", instructions: { zh: "领取", en: "Claim" }, url: "https://chatgpt.com/" };
  before.times.expires = { precision: "approximate", value: "", text: { zh: "明天", en: "Tomorrow" }, timeZone: "" };
  before.groups = [{ label: { zh: "Plus", en: "Plus" }, status: "announced",
    evidenceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }];
  for (const change of [
    (value: typeof before) => { value.scope.plans.detail = { zh: "Pro", en: "Pro" }; },
    (value: typeof before) => { value.action.instructions = { zh: "邀请朋友", en: "Invite a friend" }; },
    (value: typeof before) => { value.times.expires.text = { zh: "下个月", en: "Next month" }; },
    (value: typeof before) => { value.groups[0].label = { zh: "Pro", en: "Pro" }; },
  ]) {
    const after = structuredClone(before); change(after);
    assert.throws(() => resetNeedsNotification(before, after, "editorial"), /事实字段/);
    assert.equal(resetNeedsNotification(before, after, "progress"), true);
  }
});
test("invalid calendar instants are rejected before timezone conversion", () => {
  assert.throws(() => resetInstant("2026-02-30T12:00:00Z"), /无效日期/);
  assert.throws(() => resetInstant("2026-02-29T23:00:00+08:00"), /无效日期/);
  assert.throws(() => resetInstant("2026-10-31T24:00:00Z"), /无效日期/);
  assert.equal(resetInstant("2024-02-29T01:00:00+08:00"), "2024-02-28T17:00:00.000Z");
});
