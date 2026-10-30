import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const expectedTypes = {
  ARTICLE: "Article",
  BLOG_POSTING: "BlogPosting",
  HOW_TO: "HowTo",
  FAQ_PAGE: "FAQPage",
  NEWS_ARTICLE: "NewsArticle",
  TECH_ARTICLE: "TechArticle",
  NONE: null,
};

// Execute the actual page component with an isolated article read, without a DB.
function loadPage(locale: string, structuredDataType: string) {
  const article = {
    slug: "schema-regression",
    title: "Schema regression",
    excerpt: "Article excerpt",
    bodyHtml: "<p>Article body</p>",
    articleType: "NEWS",
    structuredDataType,
    publishedAt: new Date("2026-10-29T00:00:00Z"),
    updatedAt: new Date("2026-10-30T00:00:00Z"),
    relations: [],
  };
  const load = (filename: string): Record<string, unknown> => {
    const loadedModule = { exports: {} };
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    }).outputText;
    runInNewContext(source, {
      URL,
      module: loadedModule,
      exports: loadedModule.exports,
      process: { env: { NEXT_PUBLIC_SITE_URL: "https://geosub.org" } },
      require: (id: string) => {
        if (id === "next/link") return { default: "a" };
        if (id === "next/image") return { default: "img" };
        if (id === "next/navigation") return { notFound: () => { throw new Error("Unexpected 404"); } };
        if (id.endsWith("/articles")) return {
          getPublishedArticleBySlug: async (_slug: string, requestedLocale: string) => {
            assert.equal(requestedLocale, locale.toUpperCase());
            return article;
          },
          articleTypeLabels: { NEWS: "News" },
          getArticleTypeLabel: () => "News",
          formatArticleDate: () => "2026-10-29",
        };
        if (id.endsWith("/content-safety")) return { sanitizeArticleHtml: (html: string) => html };
        if (id.endsWith("/pricing-routes")) return { stripGeoSubTitleSuffix: (title: string) => title };
        if (id.endsWith("/json-ld") || id.endsWith("/article-structured-data")) {
          return load(resolve(filename, "..", `${id}.ts`));
        }
        if (id === "react/jsx-runtime") return require(id);
        throw new Error(`Unexpected dependency: ${id}`);
      },
    });
    return loadedModule.exports;
  };
  return load(resolve(`app/${locale}/guides/[slug]/page.tsx`)).default as
    (props: { params: Promise<{ slug: string }> }) => Promise<ReactNode>;
}

for (const locale of ["zh", "en"]) {
  for (const [storedType, schemaType] of Object.entries(expectedTypes)) {
    test(`${locale} article renders ${storedType} as ${schemaType ?? "no JSON-LD"}`, async () => {
      const Page = loadPage(locale, storedType);
      const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "schema-regression" }) }));
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      if (schemaType === null) {
        assert.equal(scripts.length, 0);
        return;
      }
      assert.equal(scripts.length, 1);
      const data = JSON.parse(scripts[0][1]);
      assert.equal(data["@type"], schemaType);
      assert.equal(data.headline, "Schema regression");
      assert.equal(data.mainEntityOfPage, `https://geosub.org/${locale}/guides/schema-regression`);
      assert.equal(data.datePublished, "2026-10-29T00:00:00.000Z");
      assert.equal(data.dateModified, "2026-10-30T00:00:00.000Z");
    });
  }
}
