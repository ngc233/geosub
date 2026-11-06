import type { CountryHubPrice } from "../country-hubs.ts";

// Completely fictional prices/identities/URLs, generated in memory only.
// 39 regions per tier models the approved aggregate's scale, not its data.
export const scaleNow = new Date("2026-11-06T03:00:00Z");
export function makeVerifiedPriceScale(count = 3000) {
  const countries = ["PH", "JP", "TR", "IN", "GB", "DE", "FR", "BR", "CA", "AU", "AR", "AT", "BE",
    "CH", "CL", "CO", "CZ", "DK", "EG", "ES", "FI", "GR", "HK", "HU", "ID", "IE", "IL", "IT",
    "KR", "MX", "MY", "NG", "NL", "NO", "NZ", "PK", "PL", "TW", "US"];
  const currencies = ["PHP", ...Array.from({ length: 31 }, (_, i) => `X${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + i % 26)}`)];
  const prices = Array.from({ length: count }, (_, i): CountryHubPrice => {
    const tier = Math.floor(i / countries.length);
    const product = String(tier % 35).padStart(3, "0");
    const plan = String(Math.floor(tier / 35)).padStart(2, "0");
    const countryCode = countries[i % countries.length];
    return {
      productSlug: `fictional-product-${product}`, productName: `虚构订阅服务 ${product}`, category: Number(product) % 2 ? "ai" : "streaming",
      planSlug: `personal-monthly-${plan}`, planName: `虚构个人月付套餐 ${plan}`, countryCode,
      amount: 20.123456789 + i % 100, currency: countryCode === "US" ? "USD" : currencies[i % currencies.length],
      platform: "ios", billingCycle: "monthly", priceType: "list_price", quality: "verified", confidence: 90,
      checkedAt: "2026-11-05T00:00:00.000Z",
      sourceUrl: `https://apps.apple.com/${countryCode.toLowerCase()}/app/fictional-subscription-service/id1234567890`,
      observationId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    };
  });
  // Include 32 FX entries, the previous aggregate's count. These are synthetic
  // ISO-shaped currencies and rates, not production quotes.
  const rates = Object.fromEntries(currencies.map(currency => [currency, {
    currency, rate: 50.123456789, source: "fictional-fixture", rateDate: "2026-11-06", fetchedAt: "2026-11-06T02:00:00.000Z", isFallback: false,
  }]));
  return { prices, rates };
}
