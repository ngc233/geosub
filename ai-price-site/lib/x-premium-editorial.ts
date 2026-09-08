import type { ProductEditorialContent } from "./product-editorial-content";
import type { PlanBillingContent } from "./plan-billing-content";

// Official sources reviewed 2026-09-08; independent of price freshness.
export const xPremiumEditorial: Record<"zh" | "en", ProductEditorialContent> = {
  "zh": {
    "summary": "X Premium 有 Basic、Premium 和 Premium+ 三档。先明确自己需要发帖工具、认证资格，还是更高档的使用权益，再比较同一套餐、同一计费周期的地区价格。本页价格表沿用 App Store 月付范围，不能与官网年付折算直接混用。",
    "sectionTitle": "套餐选择",
    "bestForLabel": "适合",
    "differenceLabel": "套餐差异",
    "availabilityLabel": "订阅前注意",
    "sourceLabel": "X 官方套餐说明",
    "plans": {
      "basic": {
        "bestFor": "主要需要编辑、长文等发帖工具，不以认证或减少广告为主要目的的用户。",
        "difference": "属于入门档，提供编辑和长帖等功能，不提供减少广告权益。",
        "availabilityNote": "Basic 不属于订阅蓝标的合格档位。",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      },
      "premium": {
        "bestFor": "经常使用 X，希望减少时间线广告，并需要申请蓝标资格的用户。",
        "difference": "在 Basic 上增加部分时间线减广告及更高 Grok 使用限额。",
        "availabilityNote": "蓝标仍需审核；购买不等于审核通过，也不构成创作者收入保证。",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      },
      "premium-plus": {
        "bestFor": "对 X 广告体验和更高档功能有明确需求，愿意为此支付更高月费的用户。",
        "difference": "在 Premium 上增加更广的去广告权益，并列有 SuperGrok 访问。",
        "availabilityNote": "官方保留偶尔展示赞助内容的例外；Grok 访问还需核对关联账号。",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      }
    }
  },
  "en": {
    "summary": "X Premium has Basic, Premium and Premium+ tiers. Choose the benefits you need before comparing regional prices for the same tier and billing period. This page retains its App Store monthly pricing scope; website annual equivalents are not interchangeable quotes.",
    "sectionTitle": "Choosing a tier",
    "bestForLabel": "Best for",
    "differenceLabel": "Main difference",
    "availabilityLabel": "Before subscribing",
    "sourceLabel": "Official X tier guide",
    "plans": {
      "basic": {
        "bestFor": "Users primarily interested in posting tools rather than verification or fewer ads.",
        "difference": "The entry tier includes editing and longer posts, without an ad-reduction benefit.",
        "availabilityNote": "Basic is not an eligible subscription tier for a blue checkmark.",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      },
      "premium": {
        "bestFor": "Frequent X users seeking fewer timeline ads and eligibility for a blue checkmark.",
        "difference": "Adds reduced timeline advertising and increased Grok usage limits over Basic.",
        "availabilityNote": "Verification requires review. Payment does not guarantee approval or creator earnings.",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      },
      "premium-plus": {
        "bestFor": "Users who specifically value broader ad removal and higher-tier benefits on X.",
        "difference": "Extends Premium with broader ad removal and listed SuperGrok access.",
        "availabilityNote": "Sponsored content may still appear. Check the linked account for Grok access.",
        "sourceUrl": "https://help.x.com/en/using-x/x-premium"
      }
    }
  }
};

export const xPremiumBilling: Record<"zh" | "en", PlanBillingContent> = {
  "zh": {
    "title": "核对订阅渠道与权益",
    "body": "本页比较 App Store 月付价格，官网年付折算不是同一报价。权益来源复核：2026-09-08；这不是价格采集日期。",
    "faqs": [
      {
        "q": "购买后一定立即获得蓝标吗？",
        "a": "不是。Premium 或 Premium+ 订阅只是资格条件之一，账号仍需符合规则并经过审核。Basic 不提供此订阅资格。"
      },
      {
        "q": "Premium+ 意味着完全看不到任何推广内容吗？",
        "a": "不能如此承诺。官方说明仍可能偶尔出现赞助内容。"
      },
      {
        "q": "X Premium+ 与直接购买 SuperGrok 是否完全一样？",
        "a": "不要直接画等号。X Premium+ 的 Grok 访问与关联的 X 账号有关，直接购买 SuperGrok 则按原购买渠道管理。先查看账号内的订阅、使用额度和账单，再决定是否需要额外订阅，不能仅凭产品名称判断重复付费或权益完全相同。"
      },
      {
        "q": "在哪里取消续费？",
        "a": "通过最初购买订阅的平台管理。网站、Apple App Store 和 Google Play 的管理入口不同，移动应用的订阅问题应按对应平台说明处理。"
      }
    ],
    "sources": [
      {
        "label": "X 蓝标要求",
        "href": "https://help.x.com/en/managing-your-account/about-x-bluecheck"
      },
      {
        "label": "X 套餐与续费",
        "href": "https://help.x.com/en/using-x/x-premium-faq"
      },
      {
        "label": "Grok 账号与订阅",
        "href": "https://docs.x.ai/grok/faq"
      }
    ]
  },
  "en": {
    "title": "Check the subscription channel and benefits",
    "body": "This page compares App Store monthly prices, not annual website equivalents. Benefits sources reviewed on 2026-09-08; this is not the price collection date.",
    "faqs": [
      {
        "q": "Is a blue checkmark guaranteed immediately?",
        "a": "No. Premium or Premium+ membership is only part of eligibility. The account must meet the criteria and pass review; Basic does not qualify."
      },
      {
        "q": "Does Premium+ remove every promotional item?",
        "a": "No such guarantee should be made. X retains an exception for occasional sponsored content."
      },
      {
        "q": "Is X Premium+ identical to a direct SuperGrok subscription?",
        "a": "Do not assume equivalence. X Premium+ access depends on the linked X account, while direct SuperGrok subscriptions are managed through their purchase channel. Check your account's subscription, usage allowance and billing before buying another plan; names alone do not establish identical benefits or duplicate charges."
      },
      {
        "q": "Where should I cancel renewal?",
        "a": "Manage renewal through the platform where you subscribed. Website, Apple App Store and Google Play subscriptions have different management paths; follow the instructions for the original channel."
      }
    ],
    "sources": [
      {
        "label": "X checkmark requirements",
        "href": "https://help.x.com/en/managing-your-account/about-x-bluecheck"
      },
      {
        "label": "X subscription FAQ",
        "href": "https://help.x.com/en/using-x/x-premium-faq"
      },
      {
        "label": "Grok account and subscription FAQ",
        "href": "https://docs.x.ai/grok/faq"
      }
    ]
  }
};
