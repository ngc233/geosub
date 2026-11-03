import type { ResetPublicEvent } from "./codex-reset.ts";

export type ResetTone = "confirmed" | "grant" | "pending" | "neutral";
export type ResetCalendarEntry = { id:string; date:string; type:string; tone:ResetTone; title:string; status:string; href:string };

/** The color describes this published record, never an individual's account. */
export function resetEventTone(event: Pick<ResetPublicEvent,"facts"|"changeKind">): ResetTone {
  if (event.changeKind === "withdrawal" || event.facts.eventStatus === "cancelled") return "neutral";
  if (event.facts.eventType === "banked_reset_grant") return "grant";
  if (event.facts.eventType === "automatic_reset" && event.facts.eventStatus === "source_confirmed_complete") return "confirmed";
  if (event.facts.eventStatus === "announced" || event.facts.eventStatus === "rolling_out") return "pending";
  return "neutral";
}

export function resetHeadline(event:ResetPublicEvent|undefined) {
  if (!event) return "暂未收录经复核的相关公告";
  if (event.changeKind === "withdrawal") return "此记录的原结论已撤回";
  if (event.facts.eventStatus === "cancelled") return "来源已取消此事件";
  if (event.facts.eventStatus === "announced") return "已预告，待来源确认";
  if (event.facts.eventStatus === "rolling_out") return event.facts.groups.some(g=>g.status==="source_confirmed_complete")&&event.facts.groups.some(g=>g.status!=="source_confirmed_complete") ? "部分完成，仍在进行" : "来源称正在进行";
  return event.facts.eventType === "automatic_reset" ? "来源确认本次重置"
    : event.facts.eventType === "banked_reset_grant" ? "来源确认重置权益发放" : "来源确认规则已生效";
}

export function resetMonthCounts(entries:ResetCalendarEntry[],month:string) {
  const records=entries.filter(entry=>entry.date.slice(0,7)===month);
  return { confirmed:records.filter(e=>e.tone==="confirmed").length,grants:records.filter(e=>e.tone==="grant").length,records:records.length };
}

export function resetDayTone(entries:ResetCalendarEntry[]):ResetTone {
  // A date with both kinds keeps both symbols in the UI; this only picks its background.
  return entries.some(e=>e.tone==="confirmed") ? "confirmed" : entries.some(e=>e.tone==="grant") ? "grant" : entries.some(e=>e.tone==="pending") ? "pending" : "neutral";
}
