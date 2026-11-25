import assert from "node:assert/strict";
import test from "node:test";
import { summarizeGta6HomepageOffers, type HomepageGameQuote } from "./homepage-game-savings.ts";

const quotes: HomepageGameQuote[] = [
  { platform: "ps5", edition: "standard", market: "HK", price: "420.00" },
  { platform: "ps5", edition: "standard", market: "US", price: "75.00" },
  { platform: "xbox", edition: "standard", market: "HK", price: "455.00" },
  { platform: "xbox", edition: "standard", market: "US", price: "85.00" },
];

test("compares each console with its own US price and picks the higher saving", () => {
  const result = summarizeGta6HomepageOffers(quotes, 7);
  assert.equal(result.showHongKongPromotion, true);
  assert.deepEqual(result.savings, { platform: "xbox", edition: "standard", percent: 24 });
});

test("selects the highest raw ratio across versions and never borrows the other version's price", () => {
  const ultimate: HomepageGameQuote[] = [
    { platform: "ps5", edition: "ultimate", market: "HK", price: "708.00" },
    { platform: "ps5", edition: "ultimate", market: "US", price: "99.99" },
    { platform: "xbox", edition: "ultimate", market: "HK", price: "730.00" },
    { platform: "xbox", edition: "ultimate", market: "US", price: "99.99" },
  ];
  const standard = quotes.map((row) => ({ ...row, price: row.market === "HK" ? "568.00" : "79.99" }));
  const rate = 7.84;
  const result = summarizeGta6HomepageOffers([...standard, ...ultimate], rate);
  assert.deepEqual(result.savings, { platform: "ps5", edition: "ultimate", percent: 10 });
  assert.equal(result.comparisons.length, 4);

  const partial = summarizeGta6HomepageOffers([...standard, ...ultimate.slice(0, 3)], rate);
  assert.deepEqual(partial.savings, { platform: "ps5", edition: "standard", percent: 9 });
  assert.deepEqual(partial.comparisons.at(-1), { platform: "xbox", edition: "ultimate", hongKong: "730.00", us: null, ratio: null });
});

test("a missing US quote or usable exchange rate hides savings only", () => {
  const incomplete = summarizeGta6HomepageOffers(quotes.slice(0, 3), 7);
  assert.equal(incomplete.showHongKongPromotion, true);
  assert.equal(incomplete.savings, null);
  for (const unavailable of [0, -7, NaN, Infinity]) {
    const result = summarizeGta6HomepageOffers(quotes, unavailable);
    assert.equal(result.showHongKongPromotion, true);
    assert.equal(result.savings, null);
    assert.ok(result.comparisons.every(({ ratio }) => ratio === null));
  }
  assert.equal(summarizeGta6HomepageOffers(quotes.slice(1), 7).showHongKongPromotion, false);
});

test("does not advertise a saving when neither console rounds to a positive percent", () => {
  const rows: HomepageGameQuote[] = [
    { platform: "ps5", edition: "standard", market: "HK", price: "450.00" },
    { platform: "ps5", edition: "standard", market: "US", price: "75.00" },
    { platform: "xbox", edition: "standard", market: "HK", price: "455.00" },
    { platform: "xbox", edition: "standard", market: "US", price: "75.00" },
  ];
  for (const rate of [6, 5.999, 6.001]) {
    assert.equal(summarizeGta6HomepageOffers(rows, rate).savings, null);
  }
});
