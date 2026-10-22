import type { SiteLocale } from "./site-locale.ts";

export function hasDisneyOverviewDecision(locale: SiteLocale, productSlug: string) {
  return locale === "en" && productSlug === "disney";
}

// UK benefit evidence is separate from changing canonical iOS quotes and dates.
// No website amount or handwritten display name is a published price fallback.
export const disneyOverviewEvidence = {
  checkedAt: "2026-10-23",
  referenceMarket: { code: "GB", currency: "GBP", label: "United Kingdom" },
  eligibility: {
    title: "App Store renewal prices · existing Apple-billed subscribers",
    description: "Disney+ no longer accepts new or returning subscriptions through Apple. Existing Apple-billed subscribers can manage their subscription through Apple; confirm the available plan and renewal amount there. New customers should check DisneyPlus.com for their own country's plans and checkout price. A listed country price does not establish account, payment or tax eligibility.",
    sourceLabel: "Disney+ UK: Apple billing and existing subscriptions",
    url: "https://help.disneyplus.com/en-GB/article/disneyplus-en-uk-third-party-subscription#apple",
  },
  comparisonTitle: "Compare Disney+ plans on the same country and billing basis",
  comparisonIntro: "The United Kingdom is the reference market below: monthly App Store renewal quotes in GBP, with USD conversions from the same records. Features describe UK plans only; other countries and billing partners may differ. Open a plan to compare its countries after choosing the features you need.",
  comparisonFooter: "Plan names, amounts, coverage and collection dates follow the published App Store dataset. An unavailable UK quote stays unavailable; a US quote, another country's minimum, website price or annual equivalent never replaces it. These are renewal references, not offers for new Apple subscriptions.",
  choices: {
    "standard-with-ads": {
      bestFor: "Lower monthly spending when you can accept advertising and watch online.",
      difference: "Check device compatibility for the ad-supported plan before choosing it.",
      features: [
        { label: "Ads", value: "Ad-supported." },
        { label: "Video and audio", value: "Up to 1080p Full HD and 5.1 audio." },
        { label: "Simultaneous viewing", value: "2 devices." },
        { label: "Downloads", value: "Not included." },
        { label: "Billing", value: "UK website: monthly only. The quote here is a monthly Apple renewal reference." },
      ],
    },
    standard: {
      bestFor: "Offline viewing and movies or series without regular ad breaks, when Full HD is enough.",
      difference: "Downloads do not increase the simultaneous streaming allowance.",
      features: [
        { label: "Ads", value: "Movies and series without regular ad breaks; exceptions below." },
        { label: "Video and audio", value: "Up to 1080p Full HD and 5.1 audio." },
        { label: "Simultaneous viewing", value: "2 devices." },
        { label: "Downloads", value: "Up to 10 supported mobile devices." },
        { label: "Billing", value: "UK website: monthly or annual. The quote here is monthly, not an annual total or equivalent." },
      ],
    },
    premium: {
      bestFor: "A compatible 4K setup or a household that needs more concurrent streams.",
      difference: "The higher stream allowance still follows Disney+ Household rules.",
      features: [
        { label: "Ads", value: "Movies and series without regular ad breaks; exceptions below." },
        { label: "Video and audio", value: "Up to 4K UHD, HDR and Dolby Atmos." },
        { label: "Simultaneous viewing", value: "4 devices." },
        { label: "Downloads", value: "Up to 10 supported mobile devices." },
        { label: "Billing", value: "UK website: monthly or annual. The quote here is monthly, not an annual total or equivalent." },
      ],
    },
  },
  purchaseTitle: "Check billing, devices and Household eligibility before choosing",
  paragraphs: [
    "Picture and sound depend on the title, device and connection; a plan's maximum is not guaranteed for every programme. Promotional or sponsored material can appear on all plans, and live programmes, channels and special events may contain advertising even on plans described as ad-free.",
    "Downloads require an eligible plan and supported mobile device; they are not downloads to a TV or computer. The download-device limit is separate from simultaneous online viewing. Check current download requirements before travelling or switching plans.",
    "A higher stream count does not permit sharing outside your Household, which is based on your primary residence. Someone outside it needs their own subscription or an eligible Extra Member arrangement; do not assume that add-on is available through Apple or in every country.",
    "UK subscriptions require an adult account holder. Confirm local service availability, account region, payment method, taxes and the full recurring amount in your own checkout. Website monthly and annual commitments are separate from these monthly App Store records. Manage a partner-billed subscription with its original provider, and check available changes there before cancelling an existing Apple subscription.",
  ],
  sources: [
    { label: "UK plans, features and website billing options", href: "https://www.disneyplus.com/en-gb/explore/what-is-disneyplus" },
    { label: "Apple billing and partner subscriptions (UK)", href: "https://help.disneyplus.com/en-GB/article/disneyplus-en-uk-third-party-subscription#apple" },
    { label: "Download eligibility and supported devices", href: "https://help.disneyplus.com/en-GB/article/disneyplus-downloads" },
    { label: "Disney+ Household and sharing restrictions", href: "https://help.disneyplus.com/en-GB/article/disneyplus-account-sharing" },
  ],
} as const;
