import { xPremiumBilling } from "./x-premium-editorial.ts";
import type { ProductPlan } from "./public-pricing-model";
import type { PricingFaq } from "./pricing-seo";
import type { SiteLocale } from "./site-locale";

export type PlanBillingContent = {
  title: string;
  body: string;
  faqs: PricingFaq[];
  sources: { label: string; href: string }[];
};

const proSource = "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan";
const apiSource = "https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console";

const claudeProBilling: Record<"zh" | "en", PlanBillingContent> = {
  zh: {
    title: "比较价格前，先确认平台和付费周期",
    body: "本页比较 Claude Pro 的 App Store 月付订阅价格。比较官网或其他平台报价时，请先确认是否同为月付、是否包含税费，以及页面显示的是实际扣款金额还是年付折算的月均价格。年付方案通常一次收取全年费用；把年费除以十二得到的月均成本，不代表可以按这个金额逐月付款。请以对应平台的官方结算页为准。",
    faqs: [
      {
        q: "本页的月付价格可以直接与年付月均价比较吗？",
        a: "可以作为了解成本的参考，但需要分别标注。请同时核对计费平台、全年总额、扣款周期和税费。GeoSub 的地区月付价格排名不混入官网年付折算价，也不据此断言某个平台一定更便宜。",
      },
      {
        q: "Claude Pro 订阅是否包含 API 调用费用？",
        a: "不包含。Claude Pro 订阅与 Claude Console/API 属于不同的计费产品。使用 API 构建应用需要单独开通并支付相应使用费用，不能把本页的订阅月费当作 API 的总成本。",
      },
    ],
    sources: [
      { label: "Claude Pro 官方计费说明", href: proSource },
      { label: "订阅与 API 的计费区别", href: apiSource },
    ],
  },
  en: {
    title: "Check the billing platform and payment schedule",
    body: "This page compares monthly Claude Pro subscriptions offered through the App Store. Before comparing a quote from the website or another platform, check its billing period, tax treatment, and whether it shows the amount charged or an annual plan's monthly equivalent. An annual subscription is charged for the year; dividing that amount by twelve does not make it a monthly payment plan. Check the relevant platform's checkout for the final amount.",
    faqs: [
      {
        q: "Can I compare these monthly prices with an annual plan's monthly equivalent?",
        a: "You can use both to understand costs, but keep the billing platform, annual total, payment schedule, and taxes visible. GeoSub's monthly regional rankings do not mix in annual website prices divided by twelve, and do not establish that one platform is always cheaper.",
      },
      {
        q: "Does Claude Pro include API usage?",
        a: "No. A Claude Pro subscription and Claude Console/API usage are billed separately. If you use the API to build an application, you need separate Console access and usage billing. The subscription price shown here is not the total cost of running an API application.",
      },
    ],
    sources: [
      { label: "Official Claude Pro billing guide", href: proSource },
      { label: "Subscription and API billing explained", href: apiSource },
    ],
  },
};

export function getPlanBillingContent({
  locale,
  productSlug,
  plan,
}: {
  locale: SiteLocale;
  productSlug: string;
  plan: ProductPlan;
}): PlanBillingContent | null {
  // This copy describes App Store monthly prices. Suppress it if the page
  // becomes empty, changes billing period, or gains another platform's prices.
  if (
    (locale !== "zh" && locale !== "en") ||
    plan.billing !== "monthly" ||
    plan.regions.length === 0 ||
    !plan.regions.every((region) => region.billingPlatform?.toLowerCase() === "ios")
  ) {
    return null;
  }
  if (productSlug === "x-premium" && ["basic", "premium", "premium-plus"].includes(plan.slug)) {
    return xPremiumBilling[locale];
  }
  return productSlug === "claude" && plan.slug === "pro" ? claudeProBilling[locale] : null;
}
