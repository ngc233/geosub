import assert from "node:assert/strict";
import test from "node:test";
import {
  getPricingProductOverviewCopy,
  getProductOverviewDecisionPlans,
  getProductOverviewPriceFact,
} from "./pricing-product-overview-copy.ts";
import type { SubscriptionProduct } from "./public-pricing-model.ts";

const product: SubscriptionProduct = {
  slug: "chatgpt",
  category: "ai",
  name: "ChatGPT",
  brand: "OpenAI",
  description: "",
  defaultPlan: "plus",
  updatedAt: "2026-08-14",
  plans: [
    {
      slug: "plus",
      name: "Plus",
      billing: "monthly",
      regions: [
        {
          rank: 1,
          country: "Philippines",
          code: "PH",
          priceUsd: 16.27,
          localPrice: "PHP 999",
          tax: "VAT included",
        },
      ],
    },
    {
      slug: "pro",
      name: "Pro 20x",
      billing: "monthly",
      regions: [
        {
          rank: 1,
          country: "United States",
          code: "US",
          priceUsd: 199.99,
          localPrice: "USD 199.99",
          tax: "Varies",
        },
      ],
    },
    {
      slug: "annual",
      name: "Annual",
      billing: "yearly",
      regions: [
        {
          rank: 1,
          country: "Canada",
          code: "CA",
          priceUsd: 9,
          localPrice: "CAD 12",
          tax: "Varies",
        },
      ],
    },
  ],
};

test("product overview search facts compare like-for-like monthly plans", () => {
  assert.deepEqual(getProductOverviewPriceFact(product), {
    planName: "ChatGPT Plus",
    country: "Philippines",
    price: "$16.27",
  });
});

test("Chinese and English product overviews answer cheapest-plan intent", () => {
  const lowest = getProductOverviewPriceFact(product);
  const zh = getPricingProductOverviewCopy({
    locale: "zh",
    productName: product.name,
    planCount: 2,
    regionCount: 39,
    lowest,
    year: 2026,
  });
  const en = getPricingProductOverviewCopy({
    locale: "en",
    productName: product.name,
    planCount: 2,
    regionCount: 39,
    lowest,
    year: 2026,
  });

  assert.equal(zh.metadataTitle, "ChatGPT 套餐价格与最便宜地区（2026）");
  assert.equal(zh.pageTitle, "ChatGPT 套餐与各地区价格");
  assert.match(zh.description, /Philippines.*ChatGPT Plus.*\$16\.27/);
  assert.equal(
    en.metadataTitle,
    "ChatGPT Plans & Prices by Country (2026)",
  );
  assert.equal(en.pageTitle, "ChatGPT Plans and Prices by Country");
  assert.ok(en.description.startsWith("The lowest reviewed ChatGPT price"));
  assert.match(en.description, /\$16\.27.*ChatGPT Plus.*Philippines/);
});

test("legacy renewal tiers cannot become the product overview recommendation", () => {
  const netflix: SubscriptionProduct = {
    ...product,
    slug: "netflix",
    category: "streaming",
    name: "Netflix",
    defaultPlan: "standard",
    plans: [
      {
        slug: "basic",
        name: "Basic",
        billing: "monthly",
        regions: [
          {
            rank: 1,
            country: "Turkey",
            code: "TR",
            priceUsd: 3,
            localPrice: "TRY 99",
            tax: "VAT included",
          },
        ],
      },
      {
        slug: "standard",
        name: "Standard",
        billing: "monthly",
        regions: [
          {
            rank: 1,
            country: "Pakistan",
            code: "PK",
            priceUsd: 5,
            localPrice: "PKR 1,400",
            tax: "Varies",
          },
        ],
      },
    ],
  };

  assert.deepEqual(getProductOverviewPriceFact(netflix), {
    planName: "Netflix Standard",
    country: "Pakistan",
    price: "$5.00",
  });
  assert.deepEqual(
    getProductOverviewDecisionPlans(netflix).map((plan) => plan.slug),
    ["standard"],
  );
});
