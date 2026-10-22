import type { SiteLocale } from "./site-locale.ts";

export function hasGeminiUltraDecision(locale: SiteLocale, productSlug: string, planSlug: string) {
  return locale === "en" && productSlug === "gemini" && planSlug === "ultra";
}

// Benefit evidence has its own review date; it is never a price collection date.
export const geminiDecisionEvidence = {
  checkedAt: "2026-10-23",
  eligibility: {
    title: "App Store prices · check your account and offer",
    description: "A regional listing does not establish purchase eligibility. Use a personal Google Account in a supported country; individual features have age and regional restrictions. Confirm the exact tier, monthly renewal amount, payment method and taxes in your own checkout. Existing Apple-billed members should use Apple's subscription settings to change plans.",
    sourceLabel: "Google's iPhone and iPad eligibility and upgrade guide",
    url: "https://support.google.com/googleone/answer/16476748?hl=en&co=GENIE.Platform%3DiOS",
  },
  choices: {
    pro: {
      bestFor: "Consider this first for regular AI work if its usage limits meet your needs.",
      difference: "Higher access to Gemini and tools such as Flow. Check Pro's current feature limits against your workload before paying for Ultra.",
    },
    ultra: {
      bestFor: "Consider upgrading when Pro's limits interrupt your work and the extra access justifies the cost.",
      difference: "Higher limits for tools such as Flow and Gemini Notebook. Gemini and Antigravity quotas depend on the exact Ultra tier; check the offer before upgrading.",
    },
  },
  tiers: "Google currently distinguishes Ultra 5x and 20x. This page's published App Store plan name does not identify that quota tier. Do not assume every Ultra listing includes the same allowance; check the exact offer in your account. Benefits and limits can vary by feature and country.",
  family: "Google One can share selected AI benefits with a family group, with shared limits for some tools. Invited members must live in the manager's country. Ultra's YouTube benefit is an Individual membership where available; it does not establish a YouTube Premium Family subscription.",
  sources: [
    { label: "Ultra benefits and tier limits", href: "https://support.google.com/googleone/answer/16286513?hl=en" },
    { label: "Pro benefits and limits", href: "https://support.google.com/googleone/answer/14534406?hl=en" },
    { label: "Google One family sharing rules", href: "https://support.google.com/googleone/answer/9004015?hl=en" },
  ],
} as const;
