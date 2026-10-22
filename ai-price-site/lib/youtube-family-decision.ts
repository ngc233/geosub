import type { SiteLocale } from "./site-locale.ts";

export function hasYouTubeFamilyDecision(locale: SiteLocale, productSlug: string, planSlug: string) {
  return locale === "en" && productSlug === "youtube-premium" && planSlug === "family";
}

// Official benefit guidance is separate from canonical prices and collection dates.
export const youtubeFamilyEvidence = {
  checkedAt: "2026-10-23",
  eligibility: {
    title: "App Store prices · same-household eligibility",
    description: "These are monthly App Store listings, not website offers or a guarantee you can subscribe. Family members must share the manager's residential address. Confirm local availability, the full household renewal amount, taxes and your payment method in checkout; trial offers and website prices may differ.",
    sourceLabel: "YouTube's official family requirements",
    url: "https://support.google.com/youtube/answer/7507349?hl=en",
  },
  comparisonTitle: "Individual, Family or Premium Lite?",
  comparisonIntro: "Compare published US monthly App Store prices in USD on the same billing basis. Family is the full household bill, not a per-person quote. Open a plan for its regional prices; a cheaper region does not establish eligibility to buy there.",
  comparisonFooter: "Plan names, prices, coverage and collection dates come from the published price data. Missing comparable prices stay unavailable; website prices, trial discounts and annual amounts do not replace them. Benefits and purchase availability can vary by country and account.",
  choices: {
    lite: {
      bestFor: "Mostly non-music videos, without YouTube Music Premium.",
      difference: "Most videos support ad-free viewing, downloads and background play. Music content and Shorts have exclusions; ads may also appear when searching or browsing.",
    },
    individual: {
      bestFor: "One person who wants full Premium and YouTube Music Premium.",
      difference: "Choose your own membership when you do not need household sharing or cannot meet Family requirements.",
    },
    family: {
      bestFor: "Several eligible people living at the same residential address.",
      difference: "Full Premium benefits for the manager and up to five additional household members, using separate Google accounts and recommendations.",
    },
  },
  purchaseTitle: "Can your household use Family?",
  paragraphs: [
    "Only the family manager can purchase the plan. The manager must be at least 18, or the applicable local age, and use a regular Google Account rather than a Workspace account. Members cannot belong to another family group or have switched groups within the past 12 months. Check local age and availability rules before inviting anyone.",
    "All members must live at the manager's residential address; being related or living in the same country alone is insufficient. YouTube checks this electronically every 30 days and may pause access if it cannot confirm the household. This is not a plan for unrelated households to split remotely.",
    "Use the subscription predominantly in the country where you signed up and represent your location accurately. Moving or extended travel may affect access; a VPN does not establish purchase eligibility. Any trial depends on your account's offer and renews at the applicable monthly price unless canceled. Check your own checkout rather than treating a listed price as a trial or tax-inclusive quote.",
  ],
  sources: [
    { label: "Full Premium and Music benefits", href: "https://support.google.com/youtube/answer/6308116?hl=en" },
    { label: "Family group and manager requirements", href: "https://support.google.com/youtube/answer/7507349?hl=en" },
    { label: "Country availability, household checks and travel", href: "https://support.google.com/youtube/answer/6307365?hl=en" },
    { label: "Premium Lite benefits and exclusions", href: "https://support.google.com/youtube/answer/15968883?hl=en" },
    { label: "Trial eligibility and monthly renewal", href: "https://support.google.com/youtube/answer/10324204?hl=en" },
  ],
} as const;
