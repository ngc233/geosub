import assert from "node:assert/strict";
import test from "node:test";
import { getPricingMetadataExperiment } from "./pricing-metadata-experiments.ts";

const stats = {
  minRegion: { country: "Argentina", priceUsd: 100 },
  maxRegion: { country: "Norway", priceUsd: 126.57 },
  referenceRegion: { country: "United States", priceUsd: 120 },
} as never;

test("targets only the English ChatGPT Pro 5x metadata experiment", () => {
  const experiment = getPricingMetadataExperiment({
    locale: "en",
    productSlug: "chatgpt",
    planSlug: "pro-5x",
    displayName: "ChatGPT Pro 5x",
    stats,
    regionCount: 39,
  });

  assert.deepEqual(experiment, {
    id: "en-chatgpt-pro-5x-2026-08-25",
    title: "ChatGPT Pro 5x Prices: $100–$127 in 39 Regions",
    description:
      "ChatGPT Pro 5x App Store prices range from $100.00 in Argentina to $126.57 in Norway. Compare 39 reviewed regions, tax, FX and affordability.",
  });
  assert.ok(`${experiment?.title} - GeoSub`.length <= 60);
  assert.ok((experiment?.description.length || 0) <= 160);

  assert.equal(
    getPricingMetadataExperiment({
      locale: "zh",
      productSlug: "chatgpt",
      planSlug: "pro-5x",
      displayName: "ChatGPT Pro 5x",
      stats,
      regionCount: 39,
    }),
    null,
  );

  assert.equal(
    getPricingMetadataExperiment({
      locale: "en",
      productSlug: "chatgpt",
      planSlug: "plus",
      displayName: "ChatGPT Plus",
      stats,
      regionCount: 39,
    }),
    null,
  );
});

test("does not publish price claims when plan statistics are unavailable", () => {
  assert.equal(
    getPricingMetadataExperiment({
      locale: "en",
      productSlug: "chatgpt",
      planSlug: "pro-5x",
      displayName: "ChatGPT Pro 5x",
      stats: null,
      regionCount: 0,
    }),
    null,
  );
});

test("targets the Chinese ChatGPT Plus Bing experiment with live price facts", () => {
  const plusStats = {
    minRegion: { country: "西班牙", priceUsd: 16.8 },
    maxRegion: { country: "印度", priceUsd: 23.9 },
    referenceRegion: { country: "美国", priceUsd: 20 },
  } as never;
  const experiment = getPricingMetadataExperiment({
    locale: "zh",
    productSlug: "chatgpt",
    planSlug: "plus",
    displayName: "ChatGPT Plus",
    stats: plusStats,
    regionCount: 40,
  });

  assert.equal(experiment?.id, "zh-chatgpt-plus-bing-2026-08-25");
  assert.equal(
    experiment?.title,
    `ChatGPT Plus 多少钱？40个地区价格对比（${new Date().getFullYear()}）`,
  );
  assert.match(experiment?.description || "", /最低约 US\$16\.80|最低约 \$16\.80/);
  assert.match(experiment?.description || "", /美国基准/);
  assert.match(experiment?.heroDescription || "", /40 个已核验地区/);
  assert.ok(`${experiment?.title} - GeoSub`.length <= 60);
  assert.ok((experiment?.description.length || 0) <= 160);

  assert.equal(
    getPricingMetadataExperiment({
      locale: "zh",
      productSlug: "chatgpt",
      planSlug: "pro",
      displayName: "ChatGPT Pro",
      stats: plusStats,
      regionCount: 40,
    }),
    null,
  );
});
