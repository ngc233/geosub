/** Shared, serializable contract. Account state and raw third-party content are never stored here. */
export type ResetLocale = "zh" | "en";
export type Bilingual = { zh: string; en: string };
export const RESET_TYPES = ["automatic_reset", "banked_reset_grant", "rule_change"] as const;
export const RESET_STATUSES = ["announced", "rolling_out", "source_confirmed_complete", "cancelled"] as const;
export type ResetType = typeof RESET_TYPES[number];
export type ResetStatus = typeof RESET_STATUSES[number];
export type ResetChange = "initial" | "progress" | "correction" | "withdrawal" | "editorial";
export type ResetReview = "draft" | "pending_review" | "published" | "rejected" | "withdrawn";
export type ResetTime = { precision: "unknown" | "approximate" | "date" | "instant"; value: string; text: Bilingual; timeZone: string };
export type ResetScopeValue = { kind: "unknown" | "all" | "limited"; detail: Bilingual };
export const RESET_SCOPE_KEYS = ["plans", "regions", "audience", "surfaces", "quota", "exclusions"] as const;
export type ResetScope = Record<typeof RESET_SCOPE_KEYS[number], ResetScopeValue>;
export type ResetFacts = {
  title: Bilingual;
  summary: Bilingual;
  eventType: ResetType;
  eventStatus: ResetStatus;
  scope: ResetScope;
  action: { kind: "unknown" | "none" | "required"; instructions: Bilingual; url: string };
  quantity: Bilingual;
  bankable: boolean | null;
  times: Record<"announced" | "effective" | "completed" | "claimDeadline" | "expires", ResetTime>;
  groups: Array<{ label: Bilingual; status: ResetStatus; evidenceId: string }>;
};
export type ResetSource = {
  id: string; generation: number; kind: "official_web" | "official_x" | "staff_x"; identity: string;
  name: string; username: string; verificationUrl: string; verificationNote: string;
  verifiedAt: string; verifiedBy: string; active: boolean;
};
export type ResetEvidence = {
  id: string; generation: number; sourceId: string; externalId: string; url: string; contextUrl: string;
  publishedAt: string | null; discoveredAt: string; checkedAt: string;
  availability: "available" | "unavailable" | "removed"; note: string;
};
export type ResetEvidenceLink = {
  evidenceId: string; role: "announcement" | "progress" | "completion" | "cancellation" | "correction"; note: string;
};
export type ResetRevision = {
  revision: number; reviewStatus: ResetReview; changeKind: ResetChange; facts: ResetFacts;
  evidenceLinks: ResetEvidenceLink[]; reason: string; createdAt: string; createdBy: string;
  evidenceSnapshot: Array<{ evidence: ResetEvidence; source: ResetSource }>;
  reviewedAt: string | null; reviewedBy: string | null;
};
export type ResetSettings = {
  generation: number; enabled: boolean; maintenanceOwner: string; maintenanceHours: Bilingual;
  checkIntervalHours: number | null;
};
export type ResetCheck = { id: string; sourceIds: string[]; startedAt: string; finishedAt: string; result: "success" | "partial" | "failed" };
export type ResetPublicEvidence = {
  id: string; name: string; kind: ResetSource["kind"]; url: string; publishedAt: string | null;
  checkedAt: string; reviewedEvidenceAt: string; availability: ResetEvidence["availability"]; active: boolean;
};
export type ResetPublicEvent = {
  id: string; revision: number; notificationVersion: number; facts: ResetFacts;
  changeKind: ResetChange; firstPublishedAt: string; updatedAt: string; reviewedAt: string;
  claimEnded: boolean;
  evidence: ResetPublicEvidence[];
  history: Array<{ revision: number; changeKind: ResetChange; publishedAt: string; note: Bilingual }>;
};
export type ResetAdminEvent = {
  id: string; generation: number; mergedInto: string | null; currentRevision: number | null;
  notificationVersion: number; firstPublishedAt: string | null; updatedAt: string;
  draft: ResetRevision | null; revisions: ResetRevision[];
};
export type ResetPublicResult = {
  enabled: boolean; events: ResetPublicEvent[]; total: number; page: number; pageSize: number;
  requestedEventId: string | null; resolvedEventId: string | null;
  maintenance: { mode: "manual"; hours: Bilingual; lastCheckedAt: string | null; delayed: boolean; sourceNames: string[] };
};
export type ResetFeedItem = {
  eventId: string; notificationVersion: number; revision: number; guid: string;
  publishedAt: string; facts: ResetFacts; changeKind: ResetChange;
  superseded: boolean; currentChangeKind: ResetChange;
};
export type ResetAdminResult = { settings: ResetSettings; sources: ResetSource[]; evidence: ResetEvidence[]; events: ResetAdminEvent[]; checks: ResetCheck[] };

export const EMPTY_RESET_SETTINGS: ResetSettings = {
  generation: 0, enabled: false, maintenanceOwner: "", maintenanceHours: { zh: "", en: "" }, checkIntervalHours: null,
};
export const bilingual = (zh = "", en = ""): Bilingual => ({ zh, en });
export function emptyResetFacts(): ResetFacts {
  const scope = Object.fromEntries(RESET_SCOPE_KEYS.map((key) => [key, { kind: "unknown", detail: bilingual() }])) as ResetScope;
  const times = Object.fromEntries(["announced", "effective", "completed", "claimDeadline", "expires"].map((key) =>
    [key, { precision: "unknown", value: "", text: bilingual(), timeZone: "" }])) as ResetFacts["times"];
  return { title: bilingual(), summary: bilingual(), eventType: "automatic_reset", eventStatus: "announced", scope,
    action: { kind: "unknown", instructions: bilingual(), url: "" }, quantity: bilingual(), bankable: null, times, groups: [] };
}
export function resetId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) throw new Error("记录 ID 无效。");
  return value;
}
export function resetGeneration(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("版本无效，请刷新后重试。");
  return Number(value);
}
export function resetText(value: unknown, limit = 2000, required = false): string {
  if (typeof value !== "string" || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new Error("文字格式或长度无效。");
  }
  const text = value.trim();
  if (required && !text) throw new Error("请填写必要信息。");
  return text;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("数据格式无效。");
  return value as Record<string, unknown>;
}
export function parseResetBilingual(value: unknown, limit = 2000, required = false): Bilingual {
  const item = record(value);
  return { zh: resetText(item.zh, limit, required), en: resetText(item.en, limit, required) };
}
export function resetUrl(value: unknown, required = false): string {
  const text = resetText(value, 2048, required);
  if (!text) return "";
  let url: URL;
  try { url = new URL(text); } catch { throw new Error("请输入完整 HTTPS 来源链接。"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) throw new Error("仅支持公开 HTTPS 链接。");
  return url.href;
}
export function resetOfficialUrl(value: unknown, required = false): string {
  const output = resetUrl(value, required);
  if (output && !/^(?:[a-z0-9-]+\.)*(?:openai|chatgpt)\.com$/.test(new URL(output).hostname)) {
    throw new Error("操作入口须为 OpenAI 或 ChatGPT 官方链接。");
  }
  return output;
}
export function resetInstant(value: unknown): string {
  const input = resetText(value, 50, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(input) || !Number.isFinite(Date.parse(input))) {
    throw new Error("精确时间须包含时区。");
  }
  const datePart = input.slice(0, 10), calendar = new Date(datePart + "T00:00:00Z");
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== datePart || Number(input.slice(11, 13)) > 23) {
    throw new Error("精确时间包含无效日期或小时。");
  }
  return new Date(input).toISOString();
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) throw new Error("状态值无效。");
  return value as T;
}
function parseTime(value: unknown): ResetTime {
  const input = record(value);
  const precision = choice(input.precision, ["unknown", "approximate", "date", "instant"] as const);
  const text = parseResetBilingual(input.text, 200, precision === "approximate");
  const timeZone = resetText(input.timeZone, 80);
  let output = resetText(input.value, 50);
  if (precision === "instant") output = resetInstant(output);
  if (precision === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(output)
    || !Number.isFinite(Date.parse(output)) || new Date(output).toISOString().slice(0, 10) !== output)) throw new Error("日期无效。");
  if ((precision === "unknown" || precision === "approximate") && output) throw new Error("未知或模糊时间不能填写精确值。");
  return { precision, value: output, text, timeZone };
}
export function parseResetFacts(value: unknown, publishing = false): ResetFacts {
  const input = record(value), scopeInput = record(input.scope), timeInput = record(input.times), action = record(input.action);
  const result = emptyResetFacts();
  result.title = parseResetBilingual(input.title, 180, publishing);
  result.summary = parseResetBilingual(input.summary, 4000, publishing);
  result.eventType = choice(input.eventType, RESET_TYPES);
  result.eventStatus = choice(input.eventStatus, RESET_STATUSES);
  for (const key of RESET_SCOPE_KEYS) {
    const item = record(scopeInput[key]);
    const kind = choice(item.kind, ["unknown", "all", "limited"] as const);
    result.scope[key] = { kind, detail: parseResetBilingual(item.detail, 500, publishing && kind === "limited") };
    if (kind === "unknown" && (result.scope[key].detail.zh || result.scope[key].detail.en)) throw new Error("未知范围不能填写确定性说明。");
  }
  const kind = choice(action.kind, ["unknown", "none", "required"] as const);
  result.action = { kind, instructions: parseResetBilingual(action.instructions, 1000, publishing && kind === "required"),
    url: resetOfficialUrl(action.url, publishing && kind === "required") };
  if (kind === "unknown" && (result.action.instructions.zh || result.action.instructions.en || result.action.url)) {
    throw new Error("未知操作不能附加确定性指引。");
  }
  result.quantity = parseResetBilingual(input.quantity, 300);
  if (input.bankable !== null && typeof input.bankable !== "boolean") throw new Error("是否可保存必须为明确值或未知。");
  result.bankable = input.bankable;
  if (result.eventType === "banked_reset_grant" && result.bankable === false) throw new Error("可保存重置不能同时标记为不可保存。");
  for (const key of Object.keys(result.times) as Array<keyof ResetFacts["times"]>) result.times[key] = parseTime(timeInput[key]);
  if (publishing && ["announced", "rolling_out"].includes(result.eventStatus) && result.times.completed.precision !== "unknown") {
    throw new Error("尚未完成的事件不能填写整体完成时间。");
  }
  if (!Array.isArray(input.groups) || input.groups.length > 20) throw new Error("分组数量无效。");
  result.groups = input.groups.map((value) => {
    const group = record(value);
    return { label: parseResetBilingual(group.label, 300, publishing), status: choice(group.status, RESET_STATUSES),
      evidenceId: resetId(group.evidenceId) };
  });
  if (result.eventStatus === "source_confirmed_complete" && result.groups.some((group) => group.status !== "source_confirmed_complete")) {
    throw new Error("部分人群尚未完成，不能将整个事件标为完成。");
  }
  if (result.groups.some((group) => group.status === "source_confirmed_complete")
    && result.groups.some((group) => group.status !== "source_confirmed_complete") && result.eventStatus !== "rolling_out") {
    throw new Error("部分完成时总进度应为发放中。");
  }
  return result;
}
export function parseResetEvidenceLinks(value: unknown): ResetEvidenceLink[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error("证据数量无效。");
  const links = value.map((value) => {
    const item = record(value);
    return { evidenceId: resetId(item.evidenceId), role: choice(item.role,
      ["announcement", "progress", "completion", "cancellation", "correction"] as const), note: resetText(item.note, 1000) };
  });
  if (new Set(links.map((link) => link.evidenceId + link.role)).size !== links.length) throw new Error("证据关联重复。");
  return links;
}
export function resetMaterialKey(facts: ResetFacts): string {
  // Editorial wording and additional corroborating sources do not create a new notification.
  const { title: _title, summary: _summary, ...material } = parseResetFacts(facts);
  void _title; void _summary;
  return JSON.stringify({ ...material, groups: material.groups.map(({ label, status }) => ({ label, status })) });
}
export function resetStructuredKey(facts: ResetFacts): string {
  // Free-text scope/action/time details carry facts. Only title/summary wording and corroborating IDs are editorial.
  return resetMaterialKey(facts);
}
export function resetNeedsNotification(previous: ResetFacts | null, facts: ResetFacts, change: ResetChange): boolean {
  if (change === "editorial") {
    if (!previous || resetStructuredKey(previous) !== resetStructuredKey(facts)) throw new Error("事实字段变化不能作为文字修订发布。");
    return false;
  }
  return !previous || change === "correction" || change === "withdrawal" || resetMaterialKey(previous) !== resetMaterialKey(facts);
}
export function resetEventUrl(locale: ResetLocale, id: string): string {
  return `/${locale}/tools/codex-reset?event=${encodeURIComponent(resetId(id))}#event-${id}`;
}
