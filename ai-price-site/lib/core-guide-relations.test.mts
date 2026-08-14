import assert from "node:assert/strict";
import test from "node:test";
import { coreGuideSlugs } from "./core-guide-content.ts";
import {
  getCoreGuideArticleRelationDescription,
  getCoreGuideCluster,
  getCoreGuideProductRelationCopy,
} from "./core-guide-relations.ts";

test("every promoted core guide belongs to a focused content cluster", () => {
  for (const slug of coreGuideSlugs) {
    const cluster = getCoreGuideCluster(slug);

    assert.equal(cluster.productSlugs.length, 2);
    assert.equal(cluster.relatedGuideSlugs.length, 2);
    assert.ok(!cluster.relatedGuideSlugs.includes(slug));
    assert.equal(new Set(cluster.productSlugs).size, cluster.productSlugs.length);
    assert.equal(
      new Set(cluster.relatedGuideSlugs).size,
      cluster.relatedGuideSlugs.length,
    );
  }
});

test("content cluster calls to action are natural in both published locales", () => {
  assert.equal(
    getCoreGuideProductRelationCopy("zh", "ChatGPT").title,
    "查看 ChatGPT 地区价格",
  );
  assert.equal(
    getCoreGuideProductRelationCopy("en", "Netflix").title,
    "View Netflix regional prices",
  );
  assert.match(getCoreGuideArticleRelationDescription("zh"), /价格判断/);
  assert.match(getCoreGuideArticleRelationDescription("en"), /pricing/);
});
