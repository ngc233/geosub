import type { SiteLocale } from "./site-locale.ts";
import { getDefaultPlanRegions, type ProductPlan } from "./public-pricing-model.ts";

export function hasGrokSuperDecision(locale: SiteLocale, productSlug: string, planSlug: string) {
  return locale === "en" && productSlug === "grok" && planSlug === "super";
}

export function hasGrokSuperAppStoreDecision(locale: SiteLocale, productSlug: string, plans: ProductPlan[]) {
  return plans.length === 1 && hasGrokSuperDecision(locale, productSlug, plans[0].slug)
    && plans[0].billing === "monthly"
    && getDefaultPlanRegions(plans[0]).some((region) => region.billingPlatform?.toLowerCase() === "ios");
}

// Guidance dates do not replace canonical price collection dates.
export const grokSuperEvidence = {
  checkedAt: "2026-10-23",
  eligibility: {
    title: "App Store SuperGrok · check the plan offered to your account",
    description: "This page compares monthly App Store SuperGrok listings. The website now offers The X Subscription to new customers; existing SuperGrok subscribers can keep their plan or switch when offered. A regional listing does not prove you can buy it. Confirm the exact plan, billing channel, renewal amount, account region, payment method and taxes in your checkout.",
    sourceLabel: "xAI's new and existing subscriber guidance",
    url: "https://x.ai/news/x-subscription",
  },
  comparisonTitle: "Compare the collected App Store plans",
  comparisonIntro: "These are published US monthly App Store prices in USD for the collected SuperGrok lineup. They are not quotes for The X Subscription's website tiers. Compare the same country, channel and period before opening a plan's regional prices.",
  comparisonFooter: "Names, prices, regional coverage and collection dates follow the published price data. A missing comparable price stays unavailable. A lower converted price does not establish purchase eligibility, and an App Store plan name does not establish entitlement to a new website bundle.",
  choices: {
    "super-lite": {
      bestFor: "Compare a lower-cost app listing if its included usage meets your needs.",
      difference: "Check the exact allowance and availability in your account; this collected listing is not a mapping to a new website tier.",
    },
    super: {
      bestFor: "Existing SuperGrok members checking renewal prices, or users whose app checkout explicitly offers this plan.",
      difference: "App Store SuperGrok prices do not quote the new website bundle. Check your included usage before choosing whether to keep or switch plans.",
    },
    "super-heavy": {
      bestFor: "Compare the higher-cost app listing when your current allowance is insufficient.",
      difference: "Confirm the usage allowance and renewal bill before upgrading. The collected name does not identify an equivalent website tier.",
    },
  },
  purchaseTitle: "Which SuperGrok price applies to you?",
  paragraphs: [
    "New website customers: xAI introduced The X Subscription on October 12, 2026. Use its current official pricing and your account's offer to choose a website plan. This page's App Store SuperGrok prices do not quote that bundle, and similar names do not establish equivalent benefits.",
    "Existing SuperGrok members: xAI says you may retain your current plan, price and features or switch when the option appears in your billing settings. Check the account and original billing channel before changing anything. Apple handles App Store transactions; website billing is managed separately. Do not assume a second purchase will replace an existing subscription.",
    "App Store shoppers: a public country listing does not establish new-purchase availability for your account. Check the offered plan and monthly renewal amount in the app and Apple's confirmation screen. Country, payment and tax conditions must be confirmed there; no cross-border purchase success is implied. Benefit guidance has a separate review date from the price observations on this page.",
  ],
  sources: [
    { label: "The X Subscription and existing SuperGrok plans", href: "https://x.ai/news/x-subscription" },
    { label: "Current website plans and eligibility", href: "https://x.ai/pricing" },
    { label: "Keeping or switching your existing plan", href: "https://docs.x.ai/x-subscription/faq" },
    { label: "Grok account and billing-channel help", href: "https://docs.x.ai/grok/faq" },
  ],
} as const;
