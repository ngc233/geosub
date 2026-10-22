import type { SiteLocale } from "./site-locale.ts";

export function hasChatGPTPro100Decision(locale: SiteLocale, productSlug: string, planSlug: string) {
  return locale === "en" && productSlug === "chatgpt" && planSlug === "pro-5x";
}

// Official product guidance has a separate date from the canonical price rows.
export const chatgptPro100Evidence = {
  checkedAt: "2026-10-23",
  eligibility: {
    title: "Monthly App Store prices · confirm the current Pro tier",
    description: "The historical 5x URL is not a promise of current usage limits. The displayed plan name follows the published data. A regional listing does not establish purchase eligibility: confirm the offered tier, monthly renewal amount, account region, payment method and taxes in your own checkout. Website offers may differ from these App Store prices.",
    sourceLabel: "OpenAI's current plans and usage guidance",
    url: "https://learn.chatgpt.com/docs/pricing",
  },
  comparisonTitle: "Which ChatGPT tier fits your usage?",
  comparisonIntro: "Compare these three collected plans on the same US monthly App Store basis. Names, amounts, collection dates and coverage come from the published price data. These are not website offers, annual equivalents or a promise that every account can purchase each tier.",
  comparisonFooter: "A missing comparable US quote stays unavailable. Open a plan to compare its countries, local prices and evidence. The number in a plan name identifies its tier; your actual regional bill is the price shown for your billing channel, currency and checkout.",
  choices: {
    plus: {
      bestFor: "Start here for regular writing, research and coding if the included usage meets your needs.",
      difference: "Check your actual usage before upgrading; a higher tier is useful only when its extra access justifies the monthly cost.",
    },
    "pro-5x": {
      bestFor: "Consider this Pro tier when the lower-cost plan's included usage regularly interrupts your work.",
      difference: "The historical 5x route does not guarantee a fixed multiplier today. Compare the current allowance in your account with the next tier before upgrading.",
    },
    pro: {
      bestFor: "Compare this higher Pro tier when the lower Pro allowance does not cover your workload.",
      difference: "Confirm the current included usage and renewal charge. A higher price does not make every feature unlimited or available in every region.",
    },
  },
  purchaseTitle: "Check the tier, billing channel and regional price",
  paragraphs: [
    "This page keeps its historical URL while displaying the published plan identity. Older 5x and 20x labels are not guarantees of today's usage multipliers. OpenAI's Pro lineup also includes a higher tier outside this focused comparison. Check the current official plan and your usage dashboard for included allowances, feature access and reset times.",
    "Choose the subscription offered to your account on the platform where you intend to pay. If you already subscribe, check your existing billing channel and renewal before making another purchase. A public App Store country listing does not prove that your account, payment method or region can buy it; a USD conversion does not change those conditions.",
    "For Canada, use the Canada row and its local currency in the regional table above. The currency selector changes the comparison currency, not the storefront or billing channel. A Canadian price converted to USD is different from the US App Store's USD list price in this comparison. Use each row's collection and exchange-rate dates and confirm any tax at checkout.",
    "ChatGPT Work and Codex usage share an allowance; model and task choices affect how much you use, and weekly limits may apply. Extra credits can be an alternative to upgrading for occasional peaks. API usage is billed separately from the subscription. Check the official guidance rather than inferring fixed message counts from a plan name.",
  ],
  sources: [
    { label: "Current OpenAI plans, usage limits and billing scope", href: "https://learn.chatgpt.com/docs/pricing" },
  ],
} as const;
