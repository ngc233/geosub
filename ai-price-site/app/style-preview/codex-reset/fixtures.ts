// Isolated UI fixtures. Only the loopback/opt-in style-preview route imports this file.
import { emptyResetFacts, type ResetPublicEvent, type ResetPublicResult } from "../../../lib/codex-reset.ts";

const note={zh:"仅用于本地样式和交互验收，不是实际公告。",en:"Local UI fixture, not a real announcement."};
function event(index:number,date:string,type:ResetPublicEvent["facts"]["eventType"],status:ResetPublicEvent["facts"]["eventStatus"]):ResetPublicEvent {
  const id=`d0000000-0000-4000-8000-${String(index).padStart(12,"0")}`,facts=emptyResetFacts();
  facts.eventType=type;facts.eventStatus=status;
  facts.title={zh:`隔离样例：${type==="banked_reset_grant"?"赠送可保存重置权益":type==="rule_change"?"相关规则调整":status==="announced"?"额外重置预告":"来源确认的额外重置"}`,en:`Isolated ${type} / ${status}`};facts.summary={...note};
  return {id,revision:1,notificationVersion:1,facts,changeKind:"initial",firstPublishedAt:date,updatedAt:date,reviewedAt:date,claimEnded:false,evidence:[{id:`e0000000-0000-4000-8000-${String(index).padStart(12,"0")}`,name:"隔离样例来源（非真实核验）",kind:"official_web",url:"https://example.com/codex-ui-fixture",publishedAt:date,checkedAt:date,reviewedEvidenceAt:date,availability:"available",active:true}],history:[{revision:1,changeKind:"initial",publishedAt:date,note:{...note}}]};
}

export function codexStyleFixture(scenario:string):ResetPublicResult {
  const pending=event(1,"2026-10-31T09:40:00.000Z","automatic_reset","announced"),confirmed=event(2,"2026-10-28T13:20:00.000Z","automatic_reset","source_confirmed_complete"),grant=event(3,"2026-10-21T12:00:00.000Z","banked_reset_grant","source_confirmed_complete"),rolling=event(4,"2026-10-29T11:00:00.000Z","automatic_reset","rolling_out"),cancelled=event(5,"2026-10-27T10:00:00.000Z","automatic_reset","cancelled"),withdrawn=event(6,"2026-10-26T10:00:00.000Z","automatic_reset","source_confirmed_complete"),rule=event(7,"2026-10-25T10:00:00.000Z","rule_change","source_confirmed_complete"),mixedGrant=event(8,"2026-10-28T12:00:00.000Z","banked_reset_grant","announced");
  withdrawn.changeKind="withdrawal";withdrawn.history.push({revision:2,changeKind:"withdrawal",publishedAt:"2026-10-30T10:00:00.000Z",note:{...note}});
  grant.facts.bankable=true;grant.facts.action={kind:"required",instructions:{...note},url:"https://example.com/codex-ui-fixture"};grant.claimEnded=true;
  confirmed.facts.times.completed={precision:"date",value:"2026-10-28",text:{zh:"来源仅说明日期",en:"Source gives a date only"},timeZone:""};
  rolling.facts.groups=[{label:{zh:"隔离人群 A",en:"Isolated group A"},status:"source_confirmed_complete",evidenceId:rolling.evidence[0].id},{label:{zh:"隔离人群 B",en:"Isolated group B"},status:"rolling_out",evidenceId:rolling.evidence[0].id}];
  rule.evidence[0].kind="staff_x";rule.evidence[0].availability="unavailable";rule.evidence[0].active=false;
  const sets:Record<string,ResetPublicEvent[]>={mixed:[pending,confirmed,grant],confirmed:[confirmed],grant:[grant],rolling:[rolling],cancelled:[cancelled],withdrawn:[withdrawn],rule:[rule],boundaries:[pending,rolling,confirmed,mixedGrant,cancelled,withdrawn,rule,grant],empty:[],delayed:[pending,confirmed,grant],long:[pending,confirmed,grant]};
  const events=Object.hasOwn(sets,scenario)?sets[scenario]:sets.mixed;
  if(scenario==="long"){events[0].facts.title.zh="隔离长标题与原文长度检验：".repeat(12);events[0].facts.summary.zh=note.zh.repeat(15);events[0].evidence[0].url="https://example.com/"+"long-path-".repeat(80);}
  return {enabled:true,events,total:events.length,page:1,pageSize:20,requestedEventId:null,resolvedEventId:null,maintenance:{mode:"manual",hours:{zh:"隔离演示，未承诺实际维护时段",en:"Isolated fixture; no actual maintenance schedule"},lastCheckedAt:scenario==="empty"?null:"2026-10-31T13:41:00.000Z",delayed:scenario==="delayed",sourceNames:["隔离样例来源"]}};
}
