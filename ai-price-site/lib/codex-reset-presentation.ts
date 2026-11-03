import type { ResetChange, ResetFacts, ResetLocale, ResetScopeValue, ResetStatus, ResetTime } from "./codex-reset";

export const resetCopy = {
  zh: {
    title: "Codex 额度重置追踪",
    description: "查看经人工复核的官方额外重置、可保存重置权益和相关规则变化，核对适用范围、进度与操作要求。",
    independent: "GeoSub 独立整理",
    disclaimer: "公共公告不能证明个人到账。你的剩余额度、周期恢复时间及可用重置权益，以官方用量页为准。",
    usage: "查看官方用量页", rss: "订阅 RSS", updates: "公告与更新", allEvents: "查看全部事件",
    manual: "人工维护", noAutomatic: "尚未启用自动监测", delayed: "人工检查延迟",
    lastCheck: "最近完整人工检查", unchecked: "尚无完整检查记录", hours: "维护时段",
    noHours: "尚未承诺固定更新时效", coverage: "检查范围", noSources: "尚未登记检查来源",
    empty: "暂未收录经复核的相关公告", emptyDetail: "没有收录记录不代表没有发生重置。请查看官方用量页确认个人情况。",
    firstPublished: "首次收录", updated: "最近事实更新", reviewed: "人工复核", sources: "来源与证据",
    action: "是否需要操作", quantity: "数量", bankable: "是否可保存", unknown: "未说明",
    all: "官方明确适用全部", none: "无需操作", required: "需要操作", actionUnknown: "是否需要操作未说明",
    actionLink: "查看官方操作说明", yes: "明确可保存", no: "明确不可保存", original: "原始表述",
    history: "更新与更正记录", permalink: "事件链接", previous: "上一页", next: "下一页", page: "页",
    merged: "该记录已合并，下方展示保留事件。", partial: "部分完成", groups: "不同人群的进度",
    sourceUnavailable: "来源暂不可访问，事实待复核", sourceRemoved: "原始来源已移除，事实待复核",
    sourceInactive: "来源身份待复核", checked: "最近核验", staff: "工作人员公开说明",
    withdrawn: "此记录的原结论已撤回", withdrawalDetail: "请以此撤回说明为准，历史结论不再作为当前事实。",
    grantNote: "重置权益发放完成不代表已使用，也不代表你的额度已恢复。",
    corrected: "已更正", changed: "已有后续更新，请查看事件的当前记录。",
    faq: "如何阅读这些记录", faqQuestion: "额外重置与周期恢复有什么区别？",
    faqAnswer: "这里整理官方宣布的额外权益动作。账户自己的周期恢复不会逐次记录，也不会根据公告推算个人恢复时间。",
    error: "暂时无法读取事件记录", errorDetail: "这不表示没有相关公告。请稍后重试，或查看官方用量页。",
    retry: "重试", notFound: "此工具或事件暂不可用", notFoundDetail: "记录可能尚未公开，或工具尚未开放。",
    loading: "正在读取已复核的事件记录……", claimEnded: "领取期已结束",
    timeZoneUnknown: "来源未说明时区", sourcePublished: "原文发布",
  },
  en: {
    title: "Codex usage reset tracker",
    description: "Review manually verified announcements about extra Codex resets, banked reset grants and related rule changes, with scope and required actions.",
    independent: "Independently curated by GeoSub",
    disclaimer: "A public announcement does not confirm receipt in your account. Check official usage information for your remaining limits, regular reset times and available resets.",
    usage: "Official usage dashboard", rss: "Subscribe via RSS", updates: "Announcements and updates", allEvents: "All events",
    manual: "Manually maintained", noAutomatic: "Automated monitoring is not enabled", delayed: "Manual review delayed",
    lastCheck: "Last complete manual check", unchecked: "No complete check recorded", hours: "Maintenance hours",
    noHours: "No fixed update schedule promised", coverage: "Sources checked", noSources: "No checking sources registered",
    empty: "No reviewed announcements recorded yet", emptyDetail: "An empty list does not mean no reset occurred. Check official usage information for your account.",
    firstPublished: "First recorded", updated: "Last fact update", reviewed: "Manually reviewed", sources: "Sources and evidence",
    action: "Action required", quantity: "Quantity", bankable: "Can be saved", unknown: "Not specified",
    all: "Explicitly applies to all", none: "No action required", required: "Action required", actionUnknown: "Required action not specified",
    actionLink: "Official action instructions", yes: "Explicitly bankable", no: "Explicitly not bankable", original: "Original wording",
    history: "Updates and corrections", permalink: "Event link", previous: "Previous", next: "Next", page: "Page",
    merged: "This record was merged. The retained event is shown below.", partial: "Partially complete", groups: "Progress by audience",
    sourceUnavailable: "Source temporarily unavailable; facts awaiting review", sourceRemoved: "Original source removed; facts awaiting review",
    sourceInactive: "Source identity awaiting review", checked: "Last checked", staff: "Staff member’s public statement",
    withdrawn: "The original conclusion has been withdrawn", withdrawalDetail: "Use this withdrawal notice; the earlier conclusion is no longer presented as current fact.",
    grantNote: "A reset grant being distributed does not mean it has been redeemed or that your allowance has been restored.",
    corrected: "Corrected", changed: "A later update is available. Check the event’s current record.",
    faq: "Reading these records", faqQuestion: "How do extra resets differ from regular resets?",
    faqAnswer: "This tracker covers extra benefits announced by official sources. It does not log each account’s regular resets or infer personal reset times from announcements.",
    error: "Event records are temporarily unavailable", errorDetail: "This does not mean there are no announcements. Try again later or check official usage information.",
    retry: "Try again", notFound: "This tool or event is not available", notFoundDetail: "The record may not be public, or the tool may not be open yet.",
    loading: "Loading reviewed event records…", claimEnded: "Claim period ended",
    timeZoneUnknown: "Source time zone not specified", sourcePublished: "Source published",
  },
} as const;

export const resetScopeLabels = {
  zh: { plans: "套餐", regions: "地区", audience: "用户群", surfaces: "使用端", quota: "额度类别", exclusions: "排除条件" },
  en: { plans: "Plans", regions: "Regions", audience: "Audience", surfaces: "Clients", quota: "Usage category", exclusions: "Exclusions" },
};
export const resetTimeLabels = {
  zh: { announced: "公告时间", effective: "生效时间", completed: "完成时间", claimDeadline: "领取截止", expires: "权益到期" },
  en: { announced: "Announced", effective: "Effective", completed: "Completed", claimDeadline: "Claim deadline", expires: "Benefit expiry" },
};
export function resetTypeLabel(facts: ResetFacts, locale: ResetLocale) {
  const names = {
    zh: { automatic_reset: "额外自动重置", banked_reset_grant: "赠送可保存重置", rule_change: "规则调整" },
    en: { automatic_reset: "Extra automatic reset", banked_reset_grant: "Banked reset grant", rule_change: "Rule change" },
  };
  return names[locale][facts.eventType];
}
export function resetStatusLabel(facts: ResetFacts, locale: ResetLocale, groupStatus?: ResetStatus) {
  const status = groupStatus ?? facts.eventStatus;
  if (!groupStatus && status === "rolling_out"
    && facts.groups.some((group) => group.status === "source_confirmed_complete")
    && facts.groups.some((group) => group.status !== "source_confirmed_complete")) return resetCopy[locale].partial;
  const rule = facts.eventType === "rule_change";
  const labels = {
    zh: { announced: "已预告", rolling_out: rule ? "生效中" : "发放中",
      source_confirmed_complete: rule ? "来源确认已生效" : "来源确认完成", cancelled: "官方已取消" },
    en: { announced: "Announced", rolling_out: rule ? "Taking effect" : "Rolling out",
      source_confirmed_complete: rule ? "Source confirms effective" : "Source confirms completion", cancelled: "Cancelled by source" },
  };
  return labels[locale][status];
}
export function resetChangeLabel(change: ResetChange, locale: ResetLocale) {
  return {
    zh: { initial: "首次发布", progress: "进展更新", correction: "更正", withdrawal: "撤回", editorial: "文字修订" },
    en: { initial: "First published", progress: "Progress update", correction: "Correction", withdrawal: "Withdrawal", editorial: "Editorial revision" },
  }[locale][change];
}
export function resetScopeText(scope: ResetScopeValue, locale: ResetLocale) {
  if (scope.kind === "unknown") return resetCopy[locale].unknown;
  return scope.detail[locale] || (scope.kind === "all" ? resetCopy[locale].all : resetCopy[locale].unknown);
}
export function resetDateTime(value: string, locale: ResetLocale): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return resetCopy[locale].unknown;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(date) + " UTC";
}
export function resetTimeText(time: ResetTime, locale: ResetLocale): string {
  if (time.precision === "unknown") return resetCopy[locale].unknown;
  if (time.precision === "approximate") return time.text[locale] || resetCopy[locale].unknown;
  if (time.precision === "date") return `${time.value} (${time.timeZone || resetCopy[locale].timeZoneUnknown})`;
  return resetDateTime(time.value, locale);
}
export function resetActionText(facts: ResetFacts, locale: ResetLocale) {
  const copy = resetCopy[locale];
  return facts.action.kind === "unknown" ? copy.actionUnknown : facts.action.kind === "none" ? copy.none : copy.required;
}
export function parseResetQuery(params: Record<string, string | string[] | undefined>) {
  const page = params.page ?? "1";
  if (typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return null;
  const eventId = params.event;
  if (eventId !== undefined && (typeof eventId !== "string"
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(eventId))) return null;
  return { page: Number(page), ...(eventId ? { eventId } : {}) };
}
export function resetSiteOrigin(): string {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").origin;
}
export const RESET_USAGE_GUIDANCE_URL = "https://chatgpt.com/codex/settings/usage";
