import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIntentSimilarity,
  getPlanIntentSimilarityText,
  getPlanSearchIntentCopy,
} from "./plan-search-intent.ts";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialCatalog,
} from "./product-editorial-content.ts";

test("current Chinese and English plans publish distinct search-intent copy", () => {
  for (const locale of ["zh", "en"] as const) {
    const entries = getProductEditorialCatalog(locale).filter(
      ({ productSlug, planSlug }) =>
        getPlanEditorialIndexingStatus(productSlug, planSlug) === "current",
    );
    const descriptions = new Set<string>();
    const questions = new Set<string>();

    for (const entry of entries) {
      const displayName = `${entry.productSlug} ${entry.planSlug}`;
      const copy = getPlanSearchIntentCopy({
        locale,
        displayName,
        productName: entry.productSlug,
        regionCount: 24,
        lowestCountry: locale === "zh" ? "日本" : "Japan",
        lowestPrice: "$19.99",
        content: entry.content,
      });

      assert.ok(copy, `${locale}/${entry.productSlug}/${entry.planSlug}`);
      assert.ok(copy.description.length >= 70);
      assert.ok(copy.description.length <= 180);
      assert.ok(
        copy.description.includes(
          entry.content.plan.difference.replace(/[。.!?！？]+$/u, ""),
        ),
      );
      assert.equal(copy.faqs.length, 2);
      assert.ok(copy.faqs.every((faq) => faq.a.length >= 30));
      assert.ok(!descriptions.has(copy.description), displayName);
      descriptions.add(copy.description);

      for (const faq of copy.faqs) {
        assert.ok(!questions.has(faq.q), faq.q);
        questions.add(faq.q);
      }
    }
  }
});

test("no two current plans reuse near-identical decision content", () => {
  for (const locale of ["zh", "en"] as const) {
    const entries = getProductEditorialCatalog(locale).filter(
      ({ productSlug, planSlug }) =>
        getPlanEditorialIndexingStatus(productSlug, planSlug) === "current",
    );

    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const similarity = calculateIntentSimilarity(
          getPlanIntentSimilarityText(entries[left].content),
          getPlanIntentSimilarityText(entries[right].content),
        );

        assert.ok(
          similarity < 0.72,
          `${locale}/${entries[left].productSlug}/${entries[left].planSlug} and ${entries[right].productSlug}/${entries[right].planSlug} are ${(similarity * 100).toFixed(1)}% similar`,
        );
      }
    }
  }
});
