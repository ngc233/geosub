export const coreGuideSlugs = [
  "price-guide",
  "gift-card-guide",
  "payment-account",
  "methodology",
] as const;

export type CoreGuideSlug = (typeof coreGuideSlugs)[number];
export type CoreGuideLocale = "zh" | "en";

export type CoreGuideSection = {
  title: string;
  body: string;
};

export type CoreGuideDefinition = {
  slug: CoreGuideSlug;
  locale: CoreGuideLocale;
  eyebrow: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  previousSeoDescriptions?: readonly string[];
  articleType: "GUIDE" | "HOW_TO" | "METHODOLOGY";
  sections: CoreGuideSection[];
  note: string;
};

const definitions: Record<CoreGuideLocale, Record<CoreGuideSlug, CoreGuideDefinition>> = {
  zh: {
    "price-guide": {
      slug: "price-guide",
      locale: "zh",
      eyebrow: "价格指南",
      title: "如何阅读地区价格",
      description: "低价排名只是起点。把本地标价、换算日期、税费和订阅资格放在一起，才能判断真实成本。",
      seoTitle: "地区订阅价格阅读指南",
      seoDescription: "了解如何结合本地标价、汇率日期、税费、账号地区与付款限制阅读订阅价格，并判断最低价是否真正适合自己。",
      seoKeywords: "地区订阅价格, 订阅价格比较, 汇率日期, 订阅税费",
      previousSeoDescriptions: [
        "学习如何结合本地标价、显示币种、汇率日期、税费和账号限制阅读地区订阅价格。",
      ],
      articleType: "GUIDE",
      sections: [
        {
          title: "先看本地标价和采集日期",
          body: "本地标价是平台在该地区展示的原始价格。先确认套餐名称、月付或年付周期以及采集日期，避免比较不同套餐或不同时间的记录。",
        },
        {
          title: "再看显示币种和汇率日期",
          body: "换算价格用于横向比较，不等于信用卡最终扣款。汇率变化会改变换算结果，但不会改变平台的本地标价。",
        },
        {
          title: "最后核对税费和购买条件",
          body: "税费、账号地区、付款方式和账单地址都可能影响结算。价格较低不代表该地区一定可供你的账号购买。",
        },
      ],
      note: "GeoSub 用美国价格作为常见比较基准，但购买前仍应以对应地区的官方结算页为准。",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "zh",
      eyebrow: "礼品卡教程",
      title: "数字礼品卡购买前检查",
      description: "礼品卡通常与地区和账号绑定。先核对兼容性，再比较面值和实际支付成本。",
      seoTitle: "数字礼品卡购买与兑换指南",
      seoDescription: "购买数字礼品卡前，先核对发行地区、账号归属、币种、面值、兑换与退款规则，并识别跨区限制、异常低价和不可追溯卖家的风险。",
      seoKeywords: "数字礼品卡, 礼品卡地区, 礼品卡兑换, 礼品卡退款",
      previousSeoDescriptions: [
        "购买数字礼品卡前应核对发行地区、账号归属、币种、面值、兑换条件和退款规则。",
      ],
      articleType: "HOW_TO",
      sections: [
        {
          title: "发行地区必须匹配账号",
          body: "不同国家或地区发行的 Apple、Google、Steam 等礼品卡通常不能跨区兑换。购买前确认账号地区与卡片发行地区一致。",
        },
        {
          title: "核对币种、面值和有效期",
          body: "相同数字面值可能代表不同币种。还应检查是否存在有效期、兑换上限、余额使用限制或订阅扣款限制。",
        },
        {
          title: "选择可追溯的销售渠道",
          body: "确认商家身份、交付方式、退款政策和客服渠道。对明显低于面值的报价保持谨慎，避免购买来源不明或已被使用的代码。",
        },
      ],
      note: "礼品卡政策由发行平台和销售商决定；兑换资格与退款结果以双方官方条款为准。",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "zh",
      eyebrow: "支付与账号",
      title: "订阅前检查账号与付款条件",
      description: "地区价格可用于比较成本，但能否购买取决于服务覆盖、账号地区和平台接受的付款信息。",
      seoTitle: "订阅支付与账号地区指南",
      seoDescription: "订阅前检查服务覆盖、账号地区、付款方式、账单地址、税费与最终结算金额，避免因地区不匹配或平台规则导致付款失败。",
      seoKeywords: "订阅付款, 账号地区, 账单地址, 付款方式",
      previousSeoDescriptions: [
        "订阅前核对服务可用地区、账号归属、付款方式、账单信息和最终结算金额。",
      ],
      articleType: "GUIDE",
      sections: [
        {
          title: "确认服务和套餐在当地可用",
          body: "同一服务可能只在部分国家提供，套餐名称和权益也可能不同。先在官方应用或结算页确认你的地区确实提供该套餐。",
        },
        {
          title: "核对账号地区与付款方式",
          body: "Apple ID 或服务账号地区、发卡国家、账单地址和付款币种可能需要一致。不要为了低价提交虚假地区或账单信息。",
        },
        {
          title: "以结算页金额作为最终成本",
          body: "银行卡换汇费、平台汇率、税费和试用资格可能只在付款前显示。GeoSub 的换算价格用于比较，不是扣款承诺。",
        },
      ],
      note: "跨地区订阅可能触发平台风控或违反服务条款。请遵守账号、付款与地区规则。",
    },
    methodology: {
      slug: "methodology",
      locale: "zh",
      eyebrow: "方法论",
      title: "GeoSub 如何检查订阅价格",
      description: "每条地区价格都会先匹配套餐，再检查币种、计费周期和样本一致性；只有可直接比较的数据才会展示。",
      seoTitle: "GeoSub 订阅价格数据方法",
      seoDescription: "了解 GeoSub 如何采集、匹配、检查并标注 App Store 地区订阅价格，以及价格采集、汇率基准、套餐复核和页面更新时间分别代表什么。",
      seoKeywords: "订阅价格数据, App Store 价格, 价格核验, 汇率日期",
      previousSeoDescriptions: [
        "了解 GeoSub 如何采集、检查并标注 App Store 地区订阅价格，以及页面上不同日期的含义。",
      ],
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "保留采集时的原始信息",
          body: "每条记录保留产品、套餐、国家或地区、本地币种、计费周期和采集时间。换算价格不会覆盖平台原始标价。",
        },
        {
          title: "检查套餐、稳定性和价格范围",
          body: "系统结合套餐匹配、重复样本和同类地区价格范围识别币种、小数点及计费周期异常。不一致的价格会暂缓展示，而不是强行进入排行。",
        },
        {
          title: "分别计算四种日期",
          body: "价格采集日期、汇率基准日期、套餐复核日期和页面更新时间含义不同，会分别计算和展示，避免把汇率更新误认为平台调价。",
        },
      ],
      note: "公开比较用于辅助理解地区价格。服务可用性、税费和最终结算金额仍可能在采集后发生变化。",
    },
  },
  en: {
    "price-guide": {
      slug: "price-guide",
      locale: "en",
      eyebrow: "Price Guide",
      title: "How to read regional subscription prices",
      description: "A low-price ranking is only the starting point. Combine local price, exchange-rate date, tax and eligibility to understand the real cost.",
      seoTitle: "How to Read Regional Subscription Prices",
      seoDescription: "Learn how to read local prices, display currencies, exchange-rate dates, taxes and account restrictions in regional subscription comparisons.",
      seoKeywords: "regional subscription prices, price comparison, exchange rates, subscription tax",
      articleType: "GUIDE",
      sections: [
        {
          title: "Start with the local price and collection date",
          body: "The local price is the amount displayed by the platform in that region. Check the plan name, monthly or annual billing cycle, and collection date before comparing records.",
        },
        {
          title: "Then check the display currency and rate date",
          body: "Converted prices support comparison; they are not a promise of the card charge. Exchange-rate movement can change the converted value without changing the local platform price.",
        },
        {
          title: "Confirm tax and purchase conditions",
          body: "Tax, account region, payment method and billing address may affect checkout. A lower regional price does not guarantee that your account can buy it.",
        },
      ],
      note: "GeoSub commonly uses the US price as a comparison baseline. Always confirm the final amount on the official regional checkout page.",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "en",
      eyebrow: "Gift Card Guide",
      title: "Checks before buying a digital gift card",
      description: "Gift cards are usually tied to a region and account. Confirm compatibility before comparing face value and purchase cost.",
      seoTitle: "Digital Gift Card Purchase and Redemption Guide",
      seoDescription: "Check the issuing region, account compatibility, currency, value, redemption conditions and refund policy before buying a digital gift card.",
      seoKeywords: "digital gift cards, gift card region, gift card redemption, gift card refund",
      articleType: "GUIDE",
      sections: [
        {
          title: "Match the issuing region to the account",
          body: "Apple, Google, Steam and similar gift cards from one country usually cannot be redeemed in another. Confirm that the card region matches the account region.",
        },
        {
          title: "Check currency, value and expiry",
          body: "The same number can represent different currencies. Also review expiry, redemption limits, balance restrictions and whether the credit can fund subscriptions.",
        },
        {
          title: "Use a traceable seller",
          body: "Check the merchant, delivery method, refund policy and support channel. Be cautious with prices far below face value or codes of unclear origin.",
        },
      ],
      note: "Gift-card eligibility and refunds are controlled by the issuing platform and seller. Their official terms remain authoritative.",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "en",
      eyebrow: "Payment & Account",
      title: "Check account and payment conditions",
      description: "Regional prices help compare cost, but purchase eligibility depends on local availability, account region and accepted payment details.",
      seoTitle: "Subscription Payment and Account Region Guide",
      seoDescription: "Check service availability, account region, payment method, billing details and the final checkout amount before subscribing.",
      seoKeywords: "subscription payment, account region, billing address, payment method",
      articleType: "GUIDE",
      sections: [
        {
          title: "Confirm the service and plan are locally available",
          body: "A service may operate in only some countries, and plan names or benefits can differ. Check the official app or checkout page for the exact plan in your region.",
        },
        {
          title: "Match account region and payment method",
          body: "Your Apple ID or service-account region, card country, billing address and payment currency may need to align. Do not submit false location or billing information.",
        },
        {
          title: "Treat checkout as the final cost",
          body: "Card conversion fees, platform exchange rates, tax and trial eligibility may appear only before payment. GeoSub conversions are comparisons, not charge guarantees.",
        },
      ],
      note: "Cross-region purchases may trigger platform controls or violate service terms. Follow the applicable account, payment and regional rules.",
    },
    methodology: {
      slug: "methodology",
      locale: "en",
      eyebrow: "Methodology",
      title: "How GeoSub checks subscription prices",
      description: "Regional observations are matched to a plan, checked for currency and billing cycle, and published only when the result is comparable.",
      seoTitle: "GeoSub Subscription Price Data Methodology",
      seoDescription: "Learn how GeoSub collects, checks and dates regional subscription prices before they appear in comparisons.",
      seoKeywords: "subscription price data, App Store prices, price verification, exchange rate date",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "Collect with the original context",
          body: "Each observation keeps the product, plan, country or region, original currency, billing cycle and collection time. The local platform price is never replaced by a converted estimate.",
        },
        {
          title: "Check identity, stability and range",
          body: "Plan matching, repeated observations and peer-region ranges help detect currency, decimal and billing-cycle errors. Inconsistent values are withheld rather than forced into a ranking.",
        },
        {
          title: "Publish dates with distinct meanings",
          body: "Collection date, exchange-rate date, plan-review date and page-update date are calculated separately. Readers can distinguish a platform price observation from a later currency conversion.",
        },
      ],
      note: "Published comparisons are informational. Platform availability, tax and the final checkout amount can still change after collection.",
    },
  },
};

export function getCoreGuideDefinition(locale: CoreGuideLocale, slug: CoreGuideSlug) {
  return definitions[locale][slug];
}

export function getAllCoreGuideDefinitions() {
  return (["zh", "en"] as const).flatMap((locale) =>
    coreGuideSlugs.map((slug) => definitions[locale][slug]),
  );
}

export function coreGuideToMarkdown(definition: CoreGuideDefinition) {
  return [
    ...definition.sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      section.body,
      "",
    ]),
    `> ${definition.note}`,
  ].join("\n");
}

export function parseCoreGuideMarkdown(
  markdown: string | null | undefined,
  fallback: Pick<CoreGuideDefinition, "sections" | "note">,
) {
  if (!markdown?.trim()) return fallback;

  const sections: CoreGuideSection[] = [];
  let title = "";
  let body: string[] = [];
  let note = "";

  const flush = () => {
    const content = body.join(" ").trim();
    if (title && content) sections.push({ title, body: content });
    title = "";
    body = [];
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      flush();
      title = heading[1].trim();
      continue;
    }

    if (line.startsWith(">")) {
      note = `${note} ${line.replace(/^>\s?/, "")}`.trim();
      continue;
    }

    if (line) body.push(line);
  }

  flush();

  return {
    sections: sections.length > 0 ? sections : fallback.sections,
    note: note || fallback.note,
  };
}
