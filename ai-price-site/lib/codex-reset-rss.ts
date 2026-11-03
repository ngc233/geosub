import { createHash } from "node:crypto";
import { RESET_SCOPE_KEYS, resetEventUrl, type ResetFeedItem, type ResetLocale } from "./codex-reset.ts";
import {
  resetActionText, resetChangeLabel, resetCopy, resetScopeLabels, resetScopeText, resetStatusLabel,
  resetTimeLabels, resetTimeText, resetTypeLabel,
} from "./codex-reset-presentation.ts";

export function escapeResetXml(text: string): string {
  // XML 1.0 rejects some characters allowed in JavaScript strings (including lone surrogates).
  return Array.from(text).filter((character) => {
    const n = character.codePointAt(0)!;
    return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 0xd7ff)
      || (n >= 0xe000 && n <= 0xfffd) || (n >= 0x10000 && n <= 0x10ffff);
  }).join("").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function renderResetRss(items: ResetFeedItem[], locale: ResetLocale, origin: string): string {
  const siteOrigin = new URL(origin).origin;
  const copy = resetCopy[locale], link = `${siteOrigin}/${locale}/tools/codex-reset`;
  const seen = new Set<string>();
  const selected = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)
    || b.eventId.localeCompare(a.eventId) || b.notificationVersion - a.notificationVersion)
    .filter((item) => {
      const key = `${item.eventId}:${item.notificationVersion}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 100);
  const entries = selected.map((item) => {
    // Old feed entries must not keep advertising a corrected or withdrawn conclusion.
    const replaced = item.superseded && (item.currentChangeKind === "correction" || item.currentChangeKind === "withdrawal");
    const withdrawal = item.changeKind === "withdrawal" || (replaced && item.currentChangeKind === "withdrawal");
    const title = withdrawal ? copy.withdrawn : replaced ? copy.corrected : item.facts.title[locale];
    const facts = item.facts;
    const description = replaced ? copy.changed : withdrawal ? facts.summary[locale]
      : [resetTypeLabel(facts, locale), resetStatusLabel(facts, locale), facts.summary[locale],
        ...RESET_SCOPE_KEYS.map((key) => `${resetScopeLabels[locale][key]}: ${resetScopeText(facts.scope[key], locale)}`),
        ...facts.groups.map((group) => `${group.label[locale]}: ${resetStatusLabel(facts, locale, group.status)}`),
        resetActionText(facts, locale), facts.action.instructions[locale],
        ...(["claimDeadline", "expires"] as const).map((key) => `${resetTimeLabels[locale][key]}: ${resetTimeText(facts.times[key], locale)}`),
        copy.disclaimer].filter(Boolean).join("\n\n");
    return ["<item>",
      `<title>${escapeResetXml(`${resetChangeLabel(item.changeKind, locale)}: ${title}`)}</title>`,
      `<link>${escapeResetXml(siteOrigin + resetEventUrl(locale, item.eventId))}</link>`,
      `<guid isPermaLink="false">${escapeResetXml(item.guid)}</guid>`,
      `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>`,
      `<description>${escapeResetXml(description)}</description>`, "</item>"].join("");
  }).join("\n");
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',
    `<title>${escapeResetXml(copy.title)} - GeoSub</title>`, `<link>${escapeResetXml(link)}</link>`,
    `<description>${escapeResetXml(copy.description)}</description>`, `<language>${locale === "zh" ? "zh-CN" : "en"}</language>`,
    `<atom:link href="${escapeResetXml(link + "/rss.xml")}" rel="self" type="application/rss+xml"/>`,
    entries, "</channel></rss>"].join("\n");
}

export function resetFeedResponse(request: Request, data: { enabled: boolean; items: ResetFeedItem[] },
  locale: ResetLocale, origin: string): Response {
  if (!data.enabled) return new Response("Not found", { status: 404,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const xml = renderResetRss(data.items, locale, origin);
  const etag = `"${createHash("sha256").update(xml).digest("hex")}"`;
  const headers = { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "no-cache, must-revalidate",
    "X-Robots-Tag": "noindex", "ETag": etag };
  const supplied = request.headers.get("if-none-match");
  const matches = supplied?.split(",").some((value) => value.trim() === "*" || value.trim().replace(/^W\//, "") === etag);
  // ETag covers editorial/source redaction too; a publication timestamp alone cannot do that.
  return new Response(matches ? null : xml, { status: matches ? 304 : 200, headers });
}
