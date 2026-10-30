import { contentTargets, getRegisteredContentTarget, type ContentTargetId } from "./content-target-registry.ts";
import { validateFactTemplate } from "./content-fact-tokens.ts";
export { getRegisteredContentTarget };
export const LEGACY_CONTENT_TARGET: ContentTargetId = "overview:en:chatgpt";
/** Fixed targets only. Production expansion stays blocked until separate acceptance. */
export function assertContentTargetRuntime(id: string = LEGACY_CONTENT_TARGET, env: Record<string, string | undefined> = process.env) {
  const target = getRegisteredContentTarget(id);
  const runtime = assertContentRuntime(env);
  if (target.id !== LEGACY_CONTENT_TARGET && runtime !== "local") throw new Error("新增内容目标仅允许本地演练，生产发布尚未启用。");
  return runtime;
}
export function findContentTarget(locale: string, slug: string, plan?: string) {
  return !plan ? contentTargets.find(t => t.locale === locale && t.productSlug === slug) ?? null : null;
}
export const CONTENT_PATH = "/en/ai-pricing/chatgpt";
export const CONTENT_TAG = "managed-content:en:chatgpt";
export type OverviewContent = {
  title: string;
  heading: string;
  description: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  sources: string[];
};
export function isContentTarget(locale: string, slug: string, plan?: string) {
  return findContentTarget(locale, slug, plan) !== null;
}
export function assertLocalContentDatabase(url: string | undefined) {
  const parsed = new URL(url || "invalid:");
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      !/^\/(?:geosub_release_\d{8}|geosub_content_pilot_test)$/.test(parsed.pathname)) {
    throw new Error("本阶段仅允许本地数据库操作；生产热发布尚未启用。");
  }
}
/** Production is explicit and separate from local rehearsal; env cannot open its durable fence. */
export function assertContentRuntime(env: Record<string, string | undefined> = process.env) {
  try { assertLocalContentDatabase(env.DATABASE_URL); return "local" as const; } catch { /* Check explicit production scope below. */ }
  const url = new URL(env.DATABASE_URL || "invalid:");
  if (env.GEOSUB_CONTENT_RUNTIME !== "production-v1" || !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/geosub_app") throw new Error("生产内容通道未启用或数据库范围不匹配。");
  return "production" as const;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("内容格式无效。");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[<>\u0000-\u0008]/u.test(value)) {
    throw new Error(`请填写纯文本，长度不能超过 ${max} 字符。`);
  }
  return value.trim();
}
export function parseOverviewContent(input: unknown, targetId: string = LEGACY_CONTENT_TARGET): OverviewContent {
  const target = getRegisteredContentTarget(targetId);
  const value = record(input);
  const allowed = ["title", "heading", "description", "sections", "faqs", "sources"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("包含不允许修改的字段。");
  if (!Array.isArray(value.sections) || value.sections.length > 4 || !Array.isArray(value.faqs) || value.faqs.length > 6 ||
      !Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 6) throw new Error("段落、FAQ 或来源数量无效。");
  const content = {
    title: text(value.title, 80), heading: text(value.heading, 100), description: text(value.description, 240),
    sections: value.sections.map((item) => { const row = record(item); if (Object.keys(row).some(k => !["heading", "body"].includes(k))) throw new Error("包含不允许修改的字段。"); return { heading: text(row.heading, 100), body: text(row.body, 2000) }; }),
    faqs: value.faqs.map((item) => { const row = record(item); if (Object.keys(row).some(k => !["q", "a"].includes(k))) throw new Error("包含不允许修改的字段。"); return { q: text(row.q, 180), a: text(row.a, 1200) }; }),
    sources: value.sources.map((item) => {
      const source = text(item, 500);
      if (target.productSlug === "claude" && /\{\{|\}\}/.test(source)) throw new Error("来源地址不支持动态事实 token。");
      const url = new URL(source);
      if (url.protocol !== "https:" || url.username || url.password || url.port ||
          !target.sourceHosts.includes(url.hostname)) throw new Error("来源须为当前产品的官方 HTTPS 页面。");
      return source;
    }),
  };
  const editorial = [content.title, content.heading, content.description, ...content.sections.flatMap((s) => [s.heading, s.body]), ...content.faqs.flatMap((s) => [s.q, s.a])].join(" ");
  const literalEditorial = validateFactTemplate(editorial, target.id);
  if (/[￥$€£¥]|\d[\d,.]*\s*(?:个?国家|个?地区|美元|欧元|英镑|人民币|%|％)|\b\d[\d,.]*\s*(?:USD|EUR|GBP|countries|regions|%)\b|\{\{/i.test(literalEditorial)) {
    throw new Error("动态价格、覆盖数与模板表达式不能作为普通文案发布；请使用页面现有价格数据。");
  }
  return content;
}
export function requireGeneration(actual: number, expected: number) {
  if (!Number.isSafeInteger(expected) || expected < 0 || actual !== expected) throw new Error("内容已被其他操作更新，请刷新后重新预览。");
}
export const pilotDraft: OverviewContent = {
  title: "ChatGPT plans and pricing comparison",
  heading: "Compare ChatGPT plans and regional prices",
  description: "Compare ChatGPT subscription plans, check regional prices and billing platforms, and open each plan for its price sources and update dates.",
  sections: [{ heading: "Compare the same billing platform", body: "Use each plan’s price table to check its billing platform, billing period and update date before comparing regions. A price from one billing platform should not be treated as a quote for another." }],
  faqs: [{ q: "Where can I check the price evidence?", a: "Open a plan from the comparison cards to inspect its regional prices, sources and update dates. Confirm current subscription terms on the official website before purchasing." }],
  sources: ["https://chatgpt.com/pricing/"],
};

/** Neutral starting copy; no unverified plan, price or purchase claims. */
export function initialContentDraft(id: string = LEGACY_CONTENT_TARGET): OverviewContent {
  const target = getRegisteredContentTarget(id);
  if (target.productSlug === "chatgpt") return pilotDraft;
  return target.locale === "zh" ? {
    title: "Claude 套餐与地区价格比较", heading: "比较 Claude 套餐与地区价格",
    description: "查看 Claude 套餐、地区价格与计费平台，并进入各套餐页面核对来源和更新时间。",
    sections: [{ heading: "按相同计费口径比较", body: "比较前请核对套餐、计费周期和计费平台。各地区价格与更新时间以对应套餐的价格表和来源记录为准；订阅条件请查阅官方说明。" }],
    faqs: [{ q: "在哪里查看价格证据？", a: "进入相应套餐页面查看地区价格、来源与更新时间，并在订阅前向官方确认当前条款。" }], sources: ["https://claude.com/pricing"],
  } : {
    title: "Claude plans and regional pricing comparison", heading: "Compare Claude plans and regional prices",
    description: "Explore Claude plans, regional prices and billing platforms, then open each plan to check its sources and update dates.",
    sections: [{ heading: "Compare the same billing scope", body: "Check the plan, billing period and billing platform before comparing regions. Refer to each plan’s price table for sources and update dates, and confirm current subscription terms on the official website." }],
    faqs: [{ q: "Where can I check price evidence?", a: "Open a plan to inspect regional prices, sources and update dates. Confirm current terms with the official provider before subscribing." }], sources: ["https://claude.com/pricing"],
  };
}
