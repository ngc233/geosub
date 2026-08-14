import assert from "node:assert/strict";
import test from "node:test";
import { getProductOverviewSearchFaqs } from "./product-overview-search-intent.ts";
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
  ],
};

test("product overview FAQs answer price, plan choice and region intent", () => {
  const faqs = getProductOverviewSearchFaqs({ locale: "en", product });

  assert.equal(faqs.length, 4);
  assert.match(faqs[0].q, /cheapest/i);
  assert.match(faqs[0].a, /ChatGPT Plus.*Philippines.*\$16\.27/);
  assert.match(faqs[1].a, /writing, study, research/i);
  assert.match(faqs[2].a, /taxes.*exchange rates/i);
  assert.match(faqs[3].a, /Apple ID region/i);
});

test("staged locales do not receive mechanically translated overview FAQs", () => {
  assert.deepEqual(
    getProductOverviewSearchFaqs({ locale: "ja", product }),
    [],
  );
});

test("Chinese plan-choice copy uses natural list punctuation", () => {
  const faqs = getProductOverviewSearchFaqs({ locale: "zh", product });

  assert.doesNotMatch(faqs[1].a, /。；/);
  assert.match(faqs[1].a, /；/);
  assert.match(faqs[1].a, /。$/);
});

test("product choice FAQs exclude legacy renewal tiers", () => {
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
        regions: product.plans[0].regions,
      },
      {
        slug: "standard",
        name: "Standard",
        billing: "monthly",
        regions: product.plans[1].regions,
      },
    ],
  };
  const faqs = getProductOverviewSearchFaqs({ locale: "en", product: netflix });

  assert.match(faqs[0].a, /Netflix Standard/);
  assert.doesNotMatch(faqs[0].a, /Netflix Basic/);
  assert.doesNotMatch(faqs[1].a, /legacy lower-cost plan/i);
});
