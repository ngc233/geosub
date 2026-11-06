import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import {
  indexableStaticGuidePaths, isRetiredPublicPath, retiredGuideSlugs,
  shouldHideFromPublicNavigation,
} from "./public-launch-routes.ts";
import { getLanguageSwitchHref } from "./language-switch-route.ts";
import { createSitemapLkgSnapshot, validateSitemapLkgSnapshot, SITEMAP_LKG_DYNAMIC_SENTINELS } from "./sitemap-lkg.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("gift guide retirement covers localized paths, suffixes and navigation without hiding other guides", () => {
  for (const locale of ["zh", "en", "zh-tw", "ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
    for (const suffix of ["", "/", "?utm_source=test", "#section", "/child"]) {
      const path = `/${locale}/guides/gift-card-guide${suffix}`;
      assert.equal(isRetiredPublicPath(path), true);
      assert.equal(shouldHideFromPublicNavigation(path), true);
    }
  }
  assert.equal(isRetiredPublicPath("/guides/gift-card-guide"), true);
  for (const path of ["/zh/guides/payment-account", "/en/guides", "/zh/ai-pricing/chatgpt/plus", "/zh/guides/gift-card-guide-other"]) {
    assert.equal(isRetiredPublicPath(path), false);
  }
  assert.equal((indexableStaticGuidePaths as readonly string[]).includes("/guides/gift-card-guide"), false);
  assert.equal(getLanguageSwitchHref("/zh/guides/gift-card-guide", "en"), "/en/guides");
});

test("retired routes terminate without reading CMS or redirecting and declare noindex", () => {
  for (const locale of ["zh", "en", "zh-tw"]) {
    const page = source(`../app/${locale}/guides/gift-card-guide/page.tsx`);
    assert.match(page, /notFound\(\)/);
    assert.match(page, /index: false/);
    assert.doesNotMatch(page, /CmsBackedGuidePage|generateMetadata|Redirect/);
  }
  assert.match(source("../components/CoreGuideHub.tsx"), /!isRetiredPublicPath/);
  assert.match(source("../app/api/search/route.ts"), /slug: \{ notIn: \[\.\.\.retiredGuideSlugs\] \}/);
  assert.match(source("../scripts/check-sitemap-budget.mts"), /slug: \{ notIn: \[\.\.\.retiredGuideSlugs\] \}/);
});

test("public article readers exclude retired CMS records; admin history remains readable", async () => {
  const calls: Array<{ model: string; args: { where: Record<string, unknown>; include?: Record<string, unknown> } }> = [];
  const model = (name: string) => ({
    findMany: async (args: (typeof calls)[number]["args"]) => { calls.push({ model: name, args }); return []; },
    findFirst: async (args: (typeof calls)[number]["args"]) => { calls.push({ model: name, args }); return null; },
  });
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  const js = ts.transpileModule(source("./articles.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(js, {
    exports,
    require: (id: string) => {
      if (id === "server-only") return {};
      if (id === "./public-launch-routes") return { retiredGuideSlugs };
      if (id === "./prisma") return { prisma: { article: model("article"), articleCategory: model("category"), articleTag: model("tag") } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  assert.equal(await exports.getPublishedArticleBySlug("gift-card-guide", "ZH"), null);
  assert.equal(calls.length, 0, "retired detail must not query CMS");
  await exports.getPublishedArticles("ZH");
  await exports.getPublishedArticlesByCategorySlug("test", "ZH");
  await exports.getPublishedArticlesByTagSlug("test", "ZH");
  for (const call of calls) assert.equal(JSON.stringify(call.args.where.slug), JSON.stringify({ notIn: ["gift-card-guide"] }));
  await exports.getPublishedArticleBySlug("price-guide", "ZH");
  const detail = calls.at(-1)!;
  assert.equal(detail.args.where.slug, "price-guide", "detail still selects exactly one requested slug");
  assert.match(JSON.stringify(detail.args.include), /"relatedArticle":\{"slug":\{"notIn":\["gift-card-guide"\]/);
  await exports.getAdminArticles();
  assert.equal(calls.at(-1)!.args.where.slug, undefined, "admin history is not retired");
});

test("sitemap cannot fall back to a snapshot from before the gift guide takedown", () => {
  const options = { siteOrigin: "https://geosub.org", now: new Date("2026-11-06T00:00:00Z"), totalBudget: 192 };
  const snapshot = createSitemapLkgSnapshot([...SITEMAP_LKG_DYNAMIC_SENTINELS, "/zh/guides/gift-card-guide"].map(path => ({ url: options.siteOrigin + path })), options);
  assert.throws(() => validateSitemapLkgSnapshot({ ...snapshot, policyVersion: "seo-policy-2026-10-31-expansion" }, options), /policyVersion is incompatible/);
});
