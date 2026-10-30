/** Registration is not activation. New targets are available only in guarded local rehearsal. */
export type ContentTargetId = "overview:en:chatgpt" | "overview:zh:claude" | "overview:en:claude";
export type ContentTarget = {
  id: ContentTargetId;
  locale: "zh" | "en";
  productSlug: "chatgpt" | "claude";
  template: "product_overview_v1";
  canonicalPath: string;
  storagePrefix: string;
  cacheTag: string;
  sourceHosts: readonly string[];
  migrationState: "legacy_serving" | "local_rehearsal";
};
const claudeSources = Object.freeze(["anthropic.com", "www.anthropic.com", "claude.com", "www.claude.com", "claude.ai", "support.anthropic.com", "support.claude.com"]);
const target = (value: ContentTarget): Readonly<ContentTarget> => Object.freeze(value);
export const contentTargets: readonly Readonly<ContentTarget>[] = Object.freeze([
  target({ id: "overview:en:chatgpt", locale: "en", productSlug: "chatgpt", template: "product_overview_v1", canonicalPath: "/en/ai-pricing/chatgpt", storagePrefix: "content-pilot:en:chatgpt:", cacheTag: "managed-content:en:chatgpt", sourceHosts: Object.freeze(["openai.com", "help.openai.com", "chatgpt.com"]), migrationState: "legacy_serving" }),
  target({ id: "overview:zh:claude", locale: "zh", productSlug: "claude", template: "product_overview_v1", canonicalPath: "/zh/ai-pricing/claude", storagePrefix: "managed-content:v2:overview:zh:claude:", cacheTag: "managed-content:v2:overview:zh:claude", sourceHosts: claudeSources, migrationState: "local_rehearsal" }),
  target({ id: "overview:en:claude", locale: "en", productSlug: "claude", template: "product_overview_v1", canonicalPath: "/en/ai-pricing/claude", storagePrefix: "managed-content:v2:overview:en:claude:", cacheTag: "managed-content:v2:overview:en:claude", sourceHosts: claudeSources, migrationState: "local_rehearsal" }),
]);
export const overviewEditorialFields = Object.freeze(["title", "heading", "description", "sections", "faqs", "sources"] as const);
export const protectedContentFields = Object.freeze(["product_id", "plan_id", "slug", "billing_cycle", "price", "last_checked_at", "fx_rate_date", "canonical", "robots", "sitemap", "navigation", "promotion", "source_config", "review_rule"] as const);

export function getRegisteredContentTarget(id: string): Readonly<ContentTarget> {
  const value = contentTargets.find((entry) => entry.id === id);
  if (!value) throw new Error("未登记的内容目标。");
  return value;
}
/** Always requires the existing runtime/fence checks; this function grants no write permission. */
export function contentTargetReadiness(id: string) {
  const value = getRegisteredContentTarget(id);
  return {
    id: value.id,
    migrationState: value.migrationState,
    requiresDurableAdmission: true as const,
    expansionActivated: false as const,
    blockers: value.migrationState === "local_rehearsal"
      ? ["production_recovery_activation", "exact_rollback_compatibility", "production_canary_acceptance"]
      : [],
  };
}
