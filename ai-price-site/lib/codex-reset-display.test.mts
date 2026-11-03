import assert from "node:assert/strict";
import test from "node:test";
import { emptyResetFacts, type ResetPublicEvent } from "./codex-reset.ts";
import { resetDayTone, resetEventTone, resetHeadline, resetMonthCounts, type ResetCalendarEntry } from "./codex-reset-display.ts";

function event(type="automatic_reset",status="source_confirmed_complete") {
  const facts=emptyResetFacts();facts.eventType=type as typeof facts.eventType;facts.eventStatus=status as typeof facts.eventStatus;
  return {facts,changeKind:"initial"} as ResetPublicEvent;
}
test("confirmed color requires a completed extra reset, not a grant or rule change",()=>{
  assert.equal(resetEventTone(event()),"confirmed");
  assert.equal(resetEventTone(event("banked_reset_grant")),"grant");
  assert.equal(resetEventTone(event("rule_change")),"neutral");
  assert.equal(resetEventTone(event("automatic_reset","announced")),"pending");
  assert.equal(resetEventTone(event("automatic_reset","rolling_out")),"pending");
});
test("withdrawn and cancelled facts cannot retain confirmed/grant color or headline",()=>{
  for(const type of ["automatic_reset","banked_reset_grant"]){const withdrawn=event(type);withdrawn.changeKind="withdrawal";assert.equal(resetEventTone(withdrawn),"neutral");assert.match(resetHeadline(withdrawn),/撤回/);assert.equal(resetEventTone(event(type,"cancelled")),"neutral");assert.match(resetHeadline(event(type,"cancelled")),/取消/);}
});
test("partial headline requires a mixture of completed and incomplete groups",()=>{
  const rolling=event("automatic_reset","rolling_out");rolling.facts.groups=[{label:{zh:"A",en:"A"},status:"source_confirmed_complete",evidenceId:"x"}];
  assert.equal(resetHeadline(rolling),"来源称正在进行");rolling.facts.groups.push({label:{zh:"B",en:"B"},status:"rolling_out",evidenceId:"y"});assert.equal(resetHeadline(rolling),"部分完成，仍在进行");assert.equal(resetEventTone(rolling),"pending");
});
test("month counts stay within first-recorded UTC month and keep grants separate",()=>{
  const row=(id:string,date:string,tone:ResetCalendarEntry["tone"]):ResetCalendarEntry=>({id,date,tone,type:"automatic_reset",title:id,status:id,href:"#"});
  const entries=[row("a","2026-10-31T23:59:59Z","confirmed"),row("b","2026-11-01T00:00:00Z","confirmed"),row("c","2026-10-31T10:00:00Z","grant"),row("d","2026-10-31T11:00:00Z","neutral")];
  assert.deepEqual(resetMonthCounts(entries,"2026-10"),{confirmed:1,grants:1,records:3});assert.deepEqual(resetMonthCounts(entries,"2026-09"),{confirmed:0,grants:0,records:0});assert.equal(resetDayTone(entries),"confirmed");assert.equal(resetDayTone(entries.slice(2)),"grant");assert.equal(resetDayTone([]),"neutral");
});
