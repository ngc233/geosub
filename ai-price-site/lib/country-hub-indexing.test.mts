import assert from "node:assert/strict";
import test from "node:test";
import { countryHubIsIndexable, getCountryHubMetadata, getIndexableCountryHubPaths } from "./country-hub-indexing.ts";

const coverage = Array.from({ length: 10 }, (_, index) => ({
  productSlug: `product-${index % 5}`,
  planSlug: `plan-${index}`,
  difference: index < 5 ? 0 : null,
}));

test("only the reviewed country hubs with substantial comparable coverage qualify", () => {
  assert.equal(countryHubIsIndexable("japan", coverage), true);
  assert.equal(countryHubIsIndexable("china", coverage), false);
  assert.equal(countryHubIsIndexable("india", coverage.slice(0, 9)), false);
  assert.equal(countryHubIsIndexable("india", [...coverage.slice(0, 9), coverage[0]]), false);
  assert.equal(countryHubIsIndexable("india", coverage.map(row => ({ ...row, productSlug: "one" }))), false);
  assert.equal(countryHubIsIndexable("india", coverage.map(row => ({ ...row, difference: null }))), false);
});

test("include the bilingual directory only when each of its four approved hubs qualifies", async () => {
  const paths = await getIndexableCountryHubPaths(async () => coverage, false);
  assert.equal(paths.length, 10);
  assert.equal(new Set(paths).size, 10);
  assert.ok(paths.includes("/zh/countries") && paths.includes("/en/countries/philippines"));
  const partial = await getIndexableCountryHubPaths(async code => code === "JP" ? [] : coverage, false);
  assert.equal(partial.length, 6);
  assert.ok(!partial.includes("/zh/countries") && !partial.includes("/en/countries/japan"));
});

test("preview produces no URLs and a failing source cannot silently replace the validated sitemap", async () => {
  const failedRead = async () => { throw new Error("read failed"); };
  assert.deepEqual(await getIndexableCountryHubPaths(failedRead, true), []);
  await assert.rejects(() => getIndexableCountryHubPaths(failedRead, false), /read failed/);
});

test("metadata follows the same page coverage, localizes the country and links only promoted translations", async () => {
  const readRows = async () => coverage;
  const details = await getCountryHubMetadata("en", "japan", readRows, false);
  assert.deepEqual(details.robots, { index: true, follow: true });
  assert.match(String(details.title), /Japan/);
  assert.deepEqual(details.alternates, {
    canonical: "/en/countries/japan",
    languages: { "zh-CN": "/zh/countries/japan", "en-US": "/en/countries/japan", "x-default": "/en/countries/japan" },
  });
  const directory = await getCountryHubMetadata("zh", null, readRows, false);
  assert.deepEqual(directory.robots, { index: true, follow: true });
  for (const meta of [
    await getCountryHubMetadata("en", "japan", async () => [], false),
    await getCountryHubMetadata("en", "new-market", readRows, false),
    await getCountryHubMetadata("zh", null, async () => { throw new Error("offline"); }, false),
    await getCountryHubMetadata("zh", "japan", async () => { throw new Error("offline"); }, false),
    await getCountryHubMetadata("en", "japan", readRows, true),
  ]) {
    assert.deepEqual(meta.robots, { index: false, follow: true });
    assert.equal(meta.alternates?.languages, undefined);
  }
});
