import type { ProductCategory } from "./public-pricing-model";

export type CountryPagePilotLocale = "zh" | "en";

export type CountryPagePilot = {
  productSlug: string;
  category: ProductCategory;
  countryCode: string;
  countrySlug: string;
  countryName: Record<CountryPagePilotLocale, string>;
  title: Record<CountryPagePilotLocale, string>;
  description: Record<CountryPagePilotLocale, string>;
  decisionSummary: Record<CountryPagePilotLocale, string>;
  localContext: Record<CountryPagePilotLocale, string>;
  availabilityCaution: Record<CountryPagePilotLocale, string>;
  evidenceKind: "price_event" | "regional_price" | "plan_structure";
  releaseBlockers?: string[];
  priceEvent?: {
    planSlug: string;
    previousLocalPrice: string;
    currentLocalPrice: string;
    confirmedAt: string;
    sourceUrl: string;
  };
};

export const countryPagePilots: CountryPagePilot[] = [
  {
    productSlug: "claude",
    category: "ai",
    countryCode: "KR",
    countrySlug: "south-korea",
    countryName: { zh: "韩国", en: "South Korea" },
    title: {
      zh: "Claude 韩国价格与套餐",
      en: "Claude prices and plans in South Korea",
    },
    description: {
      zh: "查看 Claude Pro、Max 5x 和 Max 20x 的韩国 App Store 月付价格，并区分本币调价与汇率变化。",
      en: "Review Korean App Store monthly prices for Claude Pro, Max 5x and Max 20x, with local price changes separated from exchange-rate movement.",
    },
    decisionSummary: {
      zh: "韩国区三档个人套餐齐全。Max 5x 的韩元标价出现了经复核的变化，因此比较时应以当前韩元价格为准，而不是用旧美元折算结果判断涨跌。",
      en: "All three individual tiers are present in South Korea. Max 5x has a reviewed local-price change, so the current KRW amount matters more than an older USD conversion.",
    },
    localContext: {
      zh: "适合需要直接比较 Pro 与两档 Max 使用额度的韩国区用户。高阶套餐价差较大，先确认自己的使用强度，再判断是否需要 Max。",
      en: "This page is most useful for Korean users comparing Pro with the two Max usage tiers. The step up is substantial, so expected usage should drive the choice.",
    },
    availabilityCaution: {
      zh: "购买前仍需确认 Apple ID 地区、当地付款方式和最终结算税费；GeoSub 展示的是公开商店价格，不代表跨区购买一定可行。",
      en: "Before subscribing, confirm the Apple ID region, accepted local payment method and final checkout tax. Public storefront pricing does not guarantee cross-region eligibility.",
    },
    evidenceKind: "price_event",
    priceEvent: {
      planSlug: "max-5x",
      previousLocalPrice: "KRW 99,000",
      currentLocalPrice: "KRW 199,000",
      confirmedAt: "2026-08-16",
      sourceUrl: "https://apps.apple.com/kr/app/id6473753684",
    },
  },
  {
    productSlug: "grok",
    category: "ai",
    countryCode: "KR",
    countrySlug: "south-korea",
    countryName: { zh: "韩国", en: "South Korea" },
    title: {
      zh: "Grok 韩国价格与套餐",
      en: "Grok prices and plans in South Korea",
    },
    description: {
      zh: "比较 SuperGrok Lite、SuperGrok 和 Heavy 在韩国 App Store 的月付价格与套餐差异。",
      en: "Compare monthly Korean App Store prices for SuperGrok Lite, SuperGrok and Heavy.",
    },
    decisionSummary: {
      zh: "SuperGrok Lite 的韩国本币价格已通过官方页面重放确认。三档价格跨度很大，Lite 更适合先验证使用需求，Heavy 则只适合明确需要最高额度的用户。",
      en: "The Korean local price for SuperGrok Lite has been confirmed by replaying the official storefront. The three tiers span a wide range, making Lite the cautious entry point and Heavy a specialist choice.",
    },
    localContext: {
      zh: "这不是单纯的最低价排行。页面重点解释韩国区各档位的实际月费，以及 Lite 调价后与美国基准的关系。",
      en: "This is not merely a cheapest-country ranking. It explains the actual Korean monthly tiers and how the reviewed Lite change compares with the US reference.",
    },
    availabilityCaution: {
      zh: "套餐名称以当前商店展示为准；积分包和一次性购买不会混入月付套餐比较。",
      en: "Tier names follow the current storefront. Credit packs and one-time purchases are excluded from the monthly subscription comparison.",
    },
    evidenceKind: "price_event",
    priceEvent: {
      planSlug: "super-lite",
      previousLocalPrice: "KRW 49,000",
      currentLocalPrice: "KRW 14,000",
      confirmedAt: "2026-08-16",
      sourceUrl: "https://apps.apple.com/kr/app/id6670324846",
    },
  },
  {
    productSlug: "grok",
    category: "ai",
    countryCode: "TH",
    countrySlug: "thailand",
    countryName: { zh: "泰国", en: "Thailand" },
    title: {
      zh: "Grok 泰国价格与套餐",
      en: "Grok prices and plans in Thailand",
    },
    description: {
      zh: "查看 SuperGrok 三档套餐在泰国 App Store 的泰铢月付价格，并了解 Lite 调价后的实际成本。",
      en: "Review Thai-baht monthly prices for the three SuperGrok tiers and the practical cost after the reviewed Lite price change.",
    },
    decisionSummary: {
      zh: "泰国区 Lite、Super 与 Heavy 三档均有明确月付价格。Lite 的本币变化与韩国属于同批可信事件，但泰国税务和结算条件必须独立说明。",
      en: "Thailand has clear monthly prices for Lite, Super and Heavy. The Lite movement belongs to the same trusted event as South Korea, while Thai tax and checkout conditions require separate treatment.",
    },
    localContext: {
      zh: "用户真正需要比较的是三档使用范围与泰铢月费，而不是把泰国价格机械换算成美元后只看高低。",
      en: "The useful comparison is the capability step between tiers against the THB monthly cost, not a mechanical USD ranking alone.",
    },
    availabilityCaution: {
      zh: "购买前确认泰国区 Apple ID、付款方式和最终结算金额；其他国家的账号条件不能直接套用。",
      en: "Confirm Thai Apple ID eligibility, payment support and the final checkout amount. Account conditions from another storefront may not apply.",
    },
    evidenceKind: "price_event",
    priceEvent: {
      planSlug: "super-lite",
      previousLocalPrice: "THB 990",
      currentLocalPrice: "THB 399",
      confirmedAt: "2026-08-16",
      sourceUrl: "https://apps.apple.com/th/app/id6670324846",
    },
  },
  {
    productSlug: "chatgpt",
    category: "ai",
    countryCode: "IN",
    countrySlug: "india",
    countryName: { zh: "印度", en: "India" },
    title: {
      zh: "ChatGPT 印度价格与套餐",
      en: "ChatGPT prices and plans in India",
    },
    description: {
      zh: "比较 ChatGPT Go、Plus、Pro 5x 和 Pro 20x 在印度 App Store 的卢比月付价格。",
      en: "Compare Indian App Store monthly prices for ChatGPT Go, Plus, Pro 5x and Pro 20x.",
    },
    decisionSummary: {
      zh: "印度区从低价 Go 到高阶 Pro 20x 共四档，价格和使用范围差异明显。Go 不是便宜版 Plus，选择时应先确认功能和额度是否满足需求。",
      en: "India spans four tiers from lower-cost Go to Pro 20x. Go is not simply a discounted Plus plan, so features and limits should be checked before comparing price alone.",
    },
    localContext: {
      zh: "印度页面的价值在于把四档卢比标价放在同一决策框架中，并说明哪一档适合轻量使用、常规个人使用或高强度工作。",
      en: "The India view puts all four INR prices into one decision frame, separating light use, regular personal use and high-intensity work.",
    },
    availabilityCaution: {
      zh: "Go 的提供范围可能随地区和账号变化。购买前应在自己的印度区商店确认可见套餐、付款方式和税后金额。",
      en: "Go availability can vary by storefront and account. Confirm the visible tiers, payment method and tax-inclusive checkout amount in your own Indian store.",
    },
    evidenceKind: "plan_structure",
  },
  {
    productSlug: "chatgpt",
    category: "ai",
    countryCode: "PH",
    countrySlug: "philippines",
    countryName: { zh: "菲律宾", en: "the Philippines" },
    title: {
      zh: "ChatGPT 菲律宾价格与套餐",
      en: "ChatGPT prices and plans in the Philippines",
    },
    description: {
      zh: "查看 ChatGPT Go、Plus、Pro 5x 和 Pro 20x 的菲律宾比索月付价格及适用人群。",
      en: "Review Philippine-peso monthly prices and intended use for ChatGPT Go, Plus, Pro 5x and Pro 20x.",
    },
    decisionSummary: {
      zh: "菲律宾区四档月付价格完整，其中 Plus 与 Pro 5x 的本币价格具有明确搜索需求。不同档位代表不同使用额度，不能只按价格倍数推断功能。",
      en: "All four monthly tiers are visible in the Philippines, with clear search interest around Plus and Pro 5x local pricing. Price multiples alone do not describe the capability limits.",
    },
    localContext: {
      zh: "页面将菲律宾比索标价、美元参考和套餐用途分开呈现，避免用户把汇率波动误认为官方调价。",
      en: "The page separates PHP list prices, USD reference values and plan purpose so exchange-rate movement is not mistaken for an official price change.",
    },
    availabilityCaution: {
      zh: "最终扣款可能受税费、Apple ID 地区和付款方式影响，请以菲律宾区结算页为准。",
      en: "Tax, Apple ID region and payment support can affect the final charge. The Philippine checkout page remains authoritative.",
    },
    evidenceKind: "regional_price",
  },
  {
    productSlug: "gemini",
    category: "ai",
    countryCode: "JP",
    countrySlug: "japan",
    countryName: { zh: "日本", en: "Japan" },
    title: {
      zh: "Gemini 日本价格与套餐",
      en: "Gemini prices and plans in Japan",
    },
    description: {
      zh: "比较 Google AI Plus、Pro 和 Ultra 在日本 App Store 的日元月付价格与套餐定位。",
      en: "Compare Japanese App Store monthly prices and positioning for Google AI Plus, Pro and Ultra.",
    },
    decisionSummary: {
      zh: "日本区三档 Google AI 套餐价格完整。Plus、Pro 和 Ultra 的核心差异不只是存储容量，选择前还应核对模型访问、额度和捆绑权益。",
      en: "Japan has complete pricing for all three Google AI tiers. The difference is not storage alone; model access, limits and bundled benefits should be checked before choosing.",
    },
    localContext: {
      zh: "日本页优先回答日元月费和三档差异，不把无法确认周期的同名多价商品混入当前套餐。",
      en: "The Japan page prioritizes JPY monthly cost and tier differences, excluding same-name multi-price items whose cycle cannot be verified.",
    },
    availabilityCaution: {
      zh: "Google 的网页套餐与 App Store 套餐可能存在名称或权益差异，本页只解释当前已核验的 App Store 月付项目。",
      en: "Google web plans can differ in naming or benefits. This page covers only the currently reviewed App Store monthly items.",
    },
    evidenceKind: "plan_structure",
  },
  {
    productSlug: "netflix",
    category: "streaming",
    countryCode: "IN",
    countrySlug: "india",
    countryName: { zh: "印度", en: "India" },
    title: {
      zh: "Netflix 印度价格与套餐",
      en: "Netflix prices and plans in India",
    },
    description: {
      zh: "比较 Netflix Basic、Standard 和 Premium 在印度 App Store 的卢比月付价格，并核对当前可订阅范围。",
      en: "Compare Indian App Store monthly prices for Netflix Basic, Standard and Premium, with current availability treated separately.",
    },
    decisionSummary: {
      zh: "印度区三档价格差异清晰，但 Basic 可能属于存量续订证据。新用户应优先确认结算页实际可选套餐，不能只因为数据库存在价格就认定仍可新购。",
      en: "The three Indian price points are clear, but Basic may represent legacy renewal evidence. New subscribers should confirm the tiers actually offered at checkout.",
    },
    localContext: {
      zh: "本页的重点不是宣称印度永远最便宜，而是说明各档卢比月费、画质和同时观看需求之间的取舍。",
      en: "The purpose is not to claim India is always cheapest, but to relate INR monthly cost to quality and simultaneous-stream needs.",
    },
    availabilityCaution: {
      zh: "Basic 在部分市场已不再向新用户提供。页面发布前必须再次核对印度区新用户可见套餐，并把续订价格明确标注为存量证据。",
      en: "Basic is no longer offered to new subscribers in some markets. Before release, recheck the Indian new-user checkout and label renewal-only evidence explicitly.",
    },
    evidenceKind: "plan_structure",
    releaseBlockers: ["availability.new_subscriber_basic_unverified"],
  },
];

export type CountryPageIndexApproval = {
  productSlug: string;
  category: ProductCategory;
  countryCode: string;
  approvedAt: string;
};

// Country pages stay in preview unless a reviewed product-country pair is
// explicitly promoted here. This prevents catalog growth from multiplying the
// sitemap automatically.
export const countryPageIndexApprovals = [
  {
    productSlug: "claude",
    category: "ai",
    countryCode: "KR",
    approvedAt: "2026-08-16",
  },
  {
    productSlug: "grok",
    category: "ai",
    countryCode: "KR",
    approvedAt: "2026-08-16",
  },
  {
    productSlug: "chatgpt",
    category: "ai",
    countryCode: "PH",
    approvedAt: "2026-08-16",
  },
] as const satisfies readonly CountryPageIndexApproval[];

function countryPageIndexKey({
  productSlug,
  category,
  countryCode,
}: Pick<CountryPagePilot, "productSlug" | "category" | "countryCode">) {
  return `${category}:${productSlug}:${countryCode.toUpperCase()}`;
}

const countryPageIndexApprovalByKey = new Map(
  countryPageIndexApprovals.map((approval) => [
    countryPageIndexKey(approval),
    approval,
  ]),
);

export function getCountryPageIndexApproval(pilot: CountryPagePilot) {
  return countryPageIndexApprovalByKey.get(countryPageIndexKey(pilot));
}

export function isCountryPagePilotIndexApproved(pilot: CountryPagePilot) {
  return Boolean(getCountryPageIndexApproval(pilot));
}

export function getIndexApprovedCountryPagePilots() {
  return countryPagePilots.filter(isCountryPagePilotIndexApproved);
}

export function getCountryPagePilot(
  productSlug: string,
  countrySlug: string,
  category: ProductCategory,
) {
  return countryPagePilots.find(
    (candidate) =>
      candidate.productSlug === productSlug &&
      candidate.countrySlug === countrySlug &&
      candidate.category === category,
  );
}

export function getCountryPagePilotPath(
  pilot: CountryPagePilot,
  locale: CountryPagePilotLocale,
) {
  const categoryPath = pilot.category === "streaming"
    ? "streaming-pricing"
    : "ai-pricing";
  return `/${locale}/${categoryPath}/${pilot.productSlug}/regions/${pilot.countrySlug}`;
}

export function getCountryPagePilotLanguageAlternates(
  pilot: CountryPagePilot,
): Record<string, string> | undefined {
  if (!isCountryPagePilotIndexApproved(pilot)) return undefined;

  return {
    "zh-CN": getCountryPagePilotPath(pilot, "zh"),
    "en-US": getCountryPagePilotPath(pilot, "en"),
    "x-default": getCountryPagePilotPath(pilot, "en"),
  };
}
