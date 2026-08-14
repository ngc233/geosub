import assert from "node:assert/strict";
import test from "node:test";
import {
  coreGuideSlugs,
  coreGuideToMarkdown,
  getAllCoreGuideDefinitions,
  parseCoreGuideMarkdown,
} from "./core-guide-content.ts";
import { evaluateArticleContentQuality } from "./article-content-quality.ts";

test("core guide baseline covers every promoted Chinese and English route", () => {
  const definitions = getAllCoreGuideDefinitions();

  assert.equal(definitions.length, coreGuideSlugs.length * 2);
  assert.equal(
    new Set(definitions.map((definition) => `${definition.locale}/${definition.slug}`)).size,
    definitions.length,
  );

  for (const definition of definitions) {
    assert.ok(definition.title.length >= (definition.locale === "zh" ? 6 : 10));
    assert.ok(
      definition.seoDescription.length >= (definition.locale === "zh" ? 50 : 80),
    );
    assert.ok(definition.seoKeywords.split(",").length >= 3);
    assert.equal(definition.sections.length, 3);
    assert.ok(definition.sections.every((section) => section.title && section.body.length > 40));
    assert.ok(definition.note.length > 30);
  }
});

test("reviewed core guides reach the publishable quality band with their cluster links", () => {
  for (const definition of getAllCoreGuideDefinitions()) {
    const quality = evaluateArticleContentQuality({
      locale: definition.locale === "zh" ? "ZH" : "EN",
      status: "PUBLISHED",
      title: definition.title,
      excerpt: definition.seoDescription,
      bodyMarkdown: coreGuideToMarkdown(definition),
      seoTitle: definition.seoTitle,
      seoDescription: definition.seoDescription,
      seoKeywords: definition.seoKeywords,
      canonicalUrl: `/${definition.locale}/guides/${definition.slug}`,
      noindex: false,
      relatedProductCount: 2,
      relatedArticleCount: 2,
    });

    assert.equal(
      quality.status,
      "ready",
      `${definition.locale}/${definition.slug}: ${quality.issues.map((issue) => issue.code).join(", ")}`,
    );
  }
});

test("core guide markdown can be edited in CMS without losing the card structure", () => {
  for (const definition of getAllCoreGuideDefinitions()) {
    const parsed = parseCoreGuideMarkdown(coreGuideToMarkdown(definition), definition);

    assert.deepEqual(parsed.sections, definition.sections);
    assert.equal(parsed.note, definition.note);
  }
});

test("invalid CMS markdown falls back to the reviewed baseline", () => {
  const definition = getAllCoreGuideDefinitions()[0];
  const parsed = parseCoreGuideMarkdown("A paragraph without section headings.", definition);

  assert.deepEqual(parsed.sections, definition.sections);
  assert.equal(parsed.note, definition.note);
});
