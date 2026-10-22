import type { SiteLocale } from "./site-locale.ts";

export function hasClaudeOverviewDecision(locale: SiteLocale, productSlug: string) {
  return locale === "en" && productSlug === "claude";
}

// Official benefit guidance has a separate date from the canonical price records.
export const claudeOverviewEvidence = {
  checkedAt: "2026-10-23",
  eligibility: {
    title: "Monthly App Store prices · check your location and account",
    description: "A country price does not establish purchase eligibility. Claude is available only in supported locations. Confirm the exact plan, Apple Account region, available payment method, monthly renewal amount and tax treatment in your checkout. Website and annual offers may differ; manage an existing subscription through its original billing platform.",
    sourceLabel: "Claude's supported locations",
    url: "https://support.claude.com/en/articles/8461763-where-can-i-access-claude",
  },
  comparisonTitle: "Compare Claude plans and their lowest reviewed prices",
  comparisonIntro: "Choose a usage tier first, then compare that plan's countries. Each row shows its own lowest reviewed monthly App Store price, local currency and USD conversion, alongside a comparable US monthly App Store price. The lowest countries may differ across plans; this is not a same-country upgrade quote.",
  comparisonFooter: "Names, prices, coverage and collection dates come from the same published App Store records. Missing comparable prices stay unavailable; website quotes, annual totals and another plan's minimum never replace them. USD conversions and the lowest listed country do not establish eligibility to buy there.",
  choices: {
    pro: {
      bestFor: "Regular individual use when the included capacity meets your workload.",
      difference: "Start here before paying for more capacity. Pro has session and weekly limits; its annual offer is a different billing commitment from the monthly prices shown here.",
    },
    "max-5x": {
      bestFor: "Frequent work that repeatedly reaches Pro's included usage limits.",
      difference: "Five times Pro's per-session allowance, with a weekly limit as well. Compare the same-country monthly step up before upgrading.",
    },
    "max-20x": {
      bestFor: "Sustained daily work that needs more capacity than the lower Max tier.",
      difference: "Twenty times Pro's per-session allowance. Weekly and other limits still apply; this is not unlimited usage.",
    },
  },
  purchaseTitle: "Can you use the lowest listed Claude price?",
  paragraphs: [
    "Check Claude's supported locations and the offer available to your own account. An App Store listing and its USD conversion do not establish that you can subscribe from another country. Payment options for an iOS subscription are determined by Apple; do not assume that a website payment method or price applies to the app.",
    "Keep billing commitments separate. Pro offers monthly and annual subscriptions; Max is monthly only. A website annual equivalent or website Max quote is not an App Store monthly price. Confirm the full recurring amount and taxes before subscribing, and use the platform where you originally subscribed to manage billing.",
    "Choose capacity for your work rather than assuming a higher tier is unlimited. Max's 5x and 20x labels describe per-session usage relative to Pro. Sessions reset every five hours, and weekly limits also apply. Check your account's current usage and limits before choosing a tier.",
  ],
  sources: [
    { label: "Pro benefits, billing periods and limits", href: "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan" },
    { label: "Max tiers, monthly billing and usage limits", href: "https://support.claude.com/en/articles/11049741-what-is-the-max-plan" },
    { label: "Supported locations", href: "https://support.claude.com/en/articles/8461763-where-can-i-access-claude" },
    { label: "Website versus app-store billing and payment options", href: "https://support.claude.com/en/articles/8325618-paid-plan-billing-faqs" },
  ],
} as const;
