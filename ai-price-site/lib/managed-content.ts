/** Single-page pilot. No routes or pricing identities are accepted in payloads. */
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
  return locale === "en" && slug === "chatgpt" && !plan;
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
export function parseOverviewContent(input: unknown): OverviewContent {
  const value = record(input);
  const allowed = ["title", "heading", "description", "sections", "faqs", "sources"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("包含不允许修改的字段。");
  if (!Array.isArray(value.sections) || value.sections.length > 4 || !Array.isArray(value.faqs) || value.faqs.length > 6 ||
      !Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 6) throw new Error("段落、FAQ 或来源数量无效。");
  const content = {
    title: text(value.title, 80), heading: text(value.heading, 100), description: text(value.description, 240),
    sections: value.sections.map((item) => { const row = record(item); return { heading: text(row.heading, 100), body: text(row.body, 2000) }; }),
    faqs: value.faqs.map((item) => { const row = record(item); return { q: text(row.q, 180), a: text(row.a, 1200) }; }),
    sources: value.sources.map((item) => {
      const source = text(item, 500);
      const url = new URL(source);
      if (url.protocol !== "https:" || url.username || url.password || url.port ||
          !["openai.com", "help.openai.com", "chatgpt.com"].includes(url.hostname)) throw new Error("来源须为 OpenAI 官方 HTTPS 页面。");
      return source;
    }),
  };
  const editorial = [content.title, content.heading, content.description, ...content.sections.flatMap((s) => [s.heading, s.body]), ...content.faqs.flatMap((s) => [s.q, s.a])].join(" ");
  if (/[$€£¥]|\b\d[\d,.]*\s*(?:USD|EUR|GBP|countries|regions|%)\b|\{\{/i.test(editorial)) {
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
