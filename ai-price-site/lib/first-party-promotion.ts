/** Promotion policy is deliberately separate from price and general analytics policy. */
export const PLACEMENTS = [
  { id: "zh_home_brand", label: "简体中文首页", path: "/zh" },
  { id: "zh_google_one_related", label: "Google One（产品尚未接入）", path: null },
  { id: "zh_telegram_premium_related", label: "Telegram Premium（产品尚未接入）", path: null },
] as const;
export type Placement = typeof PLACEMENTS[number]["id"];
export type Draft = { placement: Placement; merchant: string; title: string; description: string; cta: string; destination: string; evidence: string; startsAt: string; endsAt: string };
export type Revision = { id: string; campaign: string; author: string; digest: string; content: Draft };
export type Review = { revision: string; digest: string; actor: string; status: "approved" | "rejected" | "revoked"; evidence: string; termsDate: string; expiresAt: string; scope: string; limitations: string };
export type PromotionState = { generation: number; enabled: boolean; placementEnabled: boolean; revision: string | null };
export type PublicPromotion = Pick<Draft, "merchant" | "title" | "description" | "cta" | "destination"> & { revision: string; generation: number; ttlMs: number };
export const EMPTY_STATE: PromotionState = { generation: 0, enabled: false, placementEnabled: false, revision: null };
// No actual merchant or landing page has been approved. Only a reviewed code change can add one.
export const APPROVED_DESTINATIONS: readonly string[] = [];
// Reserved .invalid destination is available ONLY in the dedicated local acceptance runtime.
// It is not a real merchant approval and cannot resolve to a sales service.
export const PREPRODUCTION_DESTINATION = "https://promotion.example.invalid/acceptance";
export function preproductionRuntime(databaseUrl = process.env.DATABASE_URL, mode = process.env.GEOSUB_PROMOTION_RUNTIME) {
  try { const u = new URL(databaseUrl || ""); return ["postgres:", "postgresql:"].includes(u.protocol) && mode === "preproduction-v1" && ["127.0.0.1", "localhost"].includes(u.hostname) && /^\/geosub_promotion_preprod_[a-z0-9_]+$/.test(u.pathname); } catch { return false; }
}
export function promotionDestinations(): readonly string[] {
  return preproductionRuntime() ? [PREPRODUCTION_DESTINATION] : APPROVED_DESTINATIONS;
}
export function canPromote(role: string, operation: string) {
  return operation === "read" ? ["OWNER", "EDITOR", "VIEWER"].includes(role) : operation === "draft" ? ["OWNER", "EDITOR"].includes(role) : ["review", "enable", "pause", "off"].includes(operation) && role === "OWNER";
}
export function plain(value: unknown, max: number, optional = false): string {
  if (typeof value !== "string" || value.length > max || (!optional && !value.trim()) || /[<>\u0000-\u0008\u000b-\u001f]/u.test(value)) throw Error("字段为空、过长或含不允许的字符。");
  return value.trim();
}
export function iso(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw Error("时间必须是有效 UTC 时间，以 Z 结尾。");
  const normalized = new Date(value).toISOString();
  if (normalized.slice(0, 16) !== value.slice(0, 16)) throw Error("日期不存在。");
  return normalized;
}
export function parseDraft(value: Record<string, unknown>): Draft {
  const placement = value.placement as Placement;
  if (!PLACEMENTS.some((p) => p.id === placement)) throw Error("推广位置无效。");
  const startsAt = iso(value.startsAt), endsAt = iso(value.endsAt);
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw Error("结束时间必须晚于开始时间。");
  const destination = plain(value.destination, 500, true);
  if (destination && !safeDestination(destination)) throw Error("落地页必须是无凭据、无端口及无片段的 HTTPS 地址。");
  return { placement, merchant: plain(value.merchant, 60), title: plain(value.title, 80), description: plain(value.description, 300), cta: plain(value.cta, 24), destination, evidence: plain(value.evidence, 160, true), startsAt, endsAt };
}
export function safeDestination(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && !u.hash && u.href === value && !/^(localhost|.*\.localhost|.*\.local|[\d.]+|\[.*\])$/i.test(u.hostname) && !/%|\\/.test(value);
  } catch { return false; }
}
export function approvedDestination(value: string, allowed: readonly string[] = promotionDestinations()) {
  return safeDestination(value) && allowed.includes(value);
}
export function eligible(state: PromotionState, revision: Revision | null, review: Review | null, now = Date.now(), allowed: readonly string[] = promotionDestinations()) {
  if (!state.enabled || !state.placementEnabled || !revision || !review || state.revision !== revision.id) return false;
  const c = revision.content;
  return c.placement === "zh_home_brand" && review.status === "approved" && review.revision === revision.id && review.digest === revision.digest && review.actor !== revision.author && Boolean(review.evidence && review.scope && review.termsDate) && Date.parse(review.expiresAt) > now && Date.parse(c.startsAt) <= now && now < Date.parse(c.endsAt) && approvedDestination(c.destination, allowed);
}
export function publicPromotion(state: PromotionState, revision: Revision | null, review: Review | null, now = Date.now()): PublicPromotion | null {
  if (!preproductionRuntime()) return null;
  if (!eligible(state, revision, review, now) || !revision || !review) return null;
  const { merchant, title, description, cta, destination } = revision.content;
  return { merchant, title, description, cta, destination, revision: revision.id, generation: state.generation, ttlMs: Math.min(30_000, Date.parse(revision.content.endsAt) - now, Date.parse(review.expiresAt) - now) };
}
export function promotionRuntime(databaseUrl = process.env.DATABASE_URL, mode = process.env.GEOSUB_PROMOTION_RUNTIME) {
  if (preproductionRuntime(databaseUrl, mode)) return true;
  if (mode === "foundation-v1") {
    try { const u = new URL(databaseUrl || ""); return ["postgres:", "postgresql:"].includes(u.protocol) && Boolean(u.hostname) && u.pathname === "/geosub_app"; } catch { return false; }
  }
  try { const u = new URL(databaseUrl || ""); return ["postgres:", "postgresql:"].includes(u.protocol) && mode === "isolated-v1" && ["127.0.0.1", "localhost"].includes(u.hostname) && /^\/geosub_promotion_[a-z0-9_]+$/.test(u.pathname); } catch { return false; }
}
